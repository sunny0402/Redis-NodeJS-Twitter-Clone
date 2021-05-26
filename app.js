const path = require("path");
const express = require("express");
const redis = require("redis");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();
const redis_client = redis.createClient();

//store session data in redis
const RedisStore = require("connect-redis")(session);

//middleware to process URL-encoded data sent by form
app.use(express.urlencoded({ extended: true }));
//middleware for session
app.use(
  session({
    store: new RedisStore({ client: redis_client }),
    resave: true,
    saveUninitialized: true,
    cookie: {
      //when session initialized cookie sent to client
      maxAge: 36000000, //10 hours, in milliseconds
      httpOnly: false,
      secure: false, //unsecure so work locally
    },
    // unique value used to verify the session
    secret: "bM80SARMxlq4fiWhulfNSeUFURWLTY8vyf",
  })
);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.render("index");
});
app.listen(3000, () => {
  console.log("Server ready");
});

app.post("/", (req, res) => {
  //function which saves the userid to the session
  const saveSessionAndRenderDashboard = (userid) => {
    req.session.userid = userid;
    req.session.save();
    res.render("dashboard");
  };
  const { username, password } = req.body;
  if (!username || !password) {
    res.render("error", {
      message: "Please enter username and password.",
    });
    // ???
    return;
  }
  console.log(
    "req.body, username, password ... \n",
    req.body,
    username,
    password
  );

  redis_client.hget("users", username, (err, userid) => {
    if (!userid) {
      //user does not exist, so SIGNUP procedure
      console.log("signup procedure");
      console.log("userid", userid);

      redis_client.incr("userid", async (err, userid) => {
        redis_client.hset("users", username, userid);
        const salt_rounds = 10;
        const hashed_password = await bcrypt.hash(password, salt_rounds);
        redis_client.hset(
          `user:${userid}`,
          "hash",
          hashed_password,
          "username",
          username
        );
        //after everything ok save userid to session
        saveSessionAndRenderDashboard(userid);
      });
    } else {
      //user exists so LOGIN procedure
      redis_client.hget(
        `user:${userid}`,
        "hash",
        async (err, hashed_password) => {
          const is_pass_valid = await bcrypt.compare(password, hashed_password);
          if (is_pass_valid) {
            //password ok
            saveSessionAndRenderDashboard(userid);
          } else {
            //wrong password
            res.render("error", {
              message: "Incorrect password.",
            });
            return;
          }
        }
      );
    } //end LOGIN procedure
  });
  //now managing response.rener("a template")
  //res.end();
});

//NOTES
// HGET returns null if the key does not exist, and the value if it does
// HGET users <username> ... if number returned have login otherwise signup process
//associate the userid to the username in the users hash
//HSET users <username> <userid>
//HSET users <username> <userid>
