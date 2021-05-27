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
      //120000 is 2 minutes
      maxAge: 120000, //10 hours, in milliseconds = 36000000
      httpOnly: false,
      secure: false, //unsecure so work locally
    },
    // unique value used to verify the session
    secret: "bM80SARMxlq4fiWhulfNSeUFURWLTY8vyf",
  })
);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
console.log('path.join(__dirname, "views")...\n',path.join(__dirname, "views"));

app.get("/", (req, res) => {
  if(req.session.userid){
    res.render("dashboard");
  }
  else{
    res.render("login");
  }
});


app.post("/", (req, res) => {
  const { username, password } = req.body;
  console.log("req.body, username, password ... \n",
    req.body, username, password);

  if (!username || !password) {
    res.render("error", {
      message: "Please enter username and password.",
    });
    // ???
    return;
  }

  //function which saves the userid to the session
  const saveSessionAndRenderDashboard = (userid) => {
    req.session.userid = userid;
    req.session.save();
    res.render("dashboard");
  };

const handleSignUp = (username, password) => {
redis_client.incr("userid", async (err, userid) => {
  redis_client.hset("users", username, userid);
  const salt_rounds = 10;
  const hashed_password = await bcrypt.hash(password, salt_rounds);
  redis_client.hset(`user:${userid}`,"hash",hashed_password,"username",username);
  //after everything ok save userid to session
  saveSessionAndRenderDashboard(userid);
});
}

const handleLogin = (userid, password) => {
  redis_client.hget(`user:${userid}`,"hash", async (err, hashed_password) => {
      const is_pass_valid = await bcrypt.compare(password, hashed_password);
      if (is_pass_valid) {
        //password ok
        saveSessionAndRenderDashboard(userid);
      } else {
        //wrong password
        console.log("err",err);
        res.render("error", {
          message: "Incorrect password.",
        });
        return;
      }
    }
  );
}

  redis_client.hget("users", username, (err, userid) => {
    if (!userid) {
      //user does not exist, so SIGNUP procedure
      console.log("signup procedure");
      console.log("userid", userid);
      //handleSignUp
      handleSignUp(username,password);
    } else {
      //user exists so LOGIN procedure
      console.log("login procedure");
      console.log("userid", userid);
      //handleLogin
      handleLogin(userid,password);
    } 
  });
  //now managing response.rener("a template")
  //res.end();
});

app.get("/post", (req,res)=>{
  if(req.session.userid){
    res.render("post");
  }
  else{
    res.render("login");
  }
});

app.post("/post", (req,res)=>{
  if(!req.session.userid){
    res.render("login");
    // need return otherwise will continue to execute code below
    return
  }
  // HMSET post:<postid> userid <userid> message <message> timestamp <timestamp>
  const {message} = req.body;
  //INCR postid. redis_client.incr will always give us the next postid
  //postid assigned to each message
  redis_client.incr("postid", async(err,postid)=>{
    redis_client.hmset(`post:${postid}`,"userid",req.session.userid,"message",message,
    "timestampt",Date.now());
    res.render("dashboard");
  });
});

app.listen(4000, () => {
  console.log("Server ready");
});

//NOTES
// HGET returns null if the key does not exist, and the value if it does
// HGET users <username> ... if number returned have login otherwise signup process
//associate the userid to the username in the users hash
//HSET users <username> <userid>
//HSET users <username> <userid>
