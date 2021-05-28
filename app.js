const path = require("path");
const express = require("express");
const redis = require("redis");
const bcrypt = require("bcrypt");
const session = require("express-session");
const redis_client = redis.createClient();
const { promisify } = require('util');
const { formatDistance } = require("date-fns");

const app = express();

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
      maxAge: 36000000, //10 hours, in milliseconds = 36000000
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

//promisify functions which do not support promises. so can use aync/await
const ahget = promisify(redis_client.hget).bind(redis_client);
const asmembers = promisify(redis_client.smembers).bind(redis_client);
const ahkeys = promisify(redis_client.hkeys).bind(redis_client);
const aincr = promisify(redis_client.incr).bind(redis_client);
const alrange = promisify(redis_client.lrange).bind(redis_client);

app.get("/", homepage);

async function homepage(req, res){
  if(req.session.userid)
  {
  const currentUserName = await ahget(`user: ${req.session.userid}`,"username");
  const following = await asmembers(`following:${currentUserName}`);
  const users = await ahkeys("users");

  const timeline = [];
  const posts = await alrange(`timeline:${currentUserName}`,0,100);

  for(post of posts){
    const timestamp = await ahget(`post:${post}`,"timestamp");
    const timeString = formatDistance(new Date(), new Date(parseInt(timestamp)));


  timeline.push({
    message: await ahget(`post:${post}`, "message"),
    author: await ahget(`post:${post}`, "username"),
    timeString: timeString,
  });  }

  res.render('dashboard', {
    users: users.filter(
      (user) => user !== currentUserName && following.indexOf(user) === -1
    ),
    currentUserName,
    timeline
  });
  }else{
    res.render("login");
  }
};

app.post("/", postRouteHomepage);

 async function postRouteHomepage(req, res) {
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
  const saveSessionAndRenderDashboard = userid => {
    req.session.userid = userid;
    req.session.save();
    res.redirect('/');
  }

  //function to handle new user signup
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

  //function to handle login of existing user
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
    //in users look up the username
    redis_client.hget("users", username, (err, userid) => {
      //user does not exist, so SIGNUP procedure
      if (!userid) {
        console.log("signup procedure");
        console.log("userid", userid);

        //handleSignUp
        handleSignUp(username,password);
      } 
      //user exists so LOGIN procedure
      else {
        console.log("login procedure");
        console.log("userid", userid);

        //handleLogin
        handleLogin(userid,password);
      } 
    });
};

//ROUTE: user wants to post a message (a tweet)
app.get("/post", (req,res)=>{
  if(req.session.userid){
    res.render("post");
  }
  else{
    res.render("login");
  }
});

//ROUTE: will be used to save user messages
// HMSET post:<postid> userid <userid> message <message> timestamp <timestamp>
app.post("/post",saveMessages);

async function saveMessages(req,res){
  if(!req.session.userid){
    res.render("login");
    // need return otherwise will continue to execute code below
    return
  }
  const {message} = req.body;
  const currentUserName = await ahget(`user:${req.session.userid}`, "username");
  const postid = await aincr("postid");
  redis_client.hmset(`post:${postid}`,
  "userid",
  req.session.userid,
  "username",
  currentUserName,
  "message",
  message,
  "timestamp",
  Date.now()
);

redis_client.lpush(`timeline:${currentUserName}`,postid);
const followers = await asmembers(`followers:${currentUserName}`);
for(follower of followers){
  redis_client.lpush(`timeline:${follower}`, postid)
}

res.redirect("/");
};

//ROUTE: display other users to to follow
app.post("/follow", displayWhoToFollow);

async function displayWhoToFollow(req,res){
  if(!req.session.userid){
    res.render("login");
    return;
  }

  const {username} = req.body;
  redis_client.hget(`user:${req.session.userid}`,
  "username", (err,currentUserName)=>{
    // SADD <setkey> <value>
    redis_client.sadd(`following:${currentUserName}`,username);
    redis_client.sadd(`followers:${username}`,currentUserName);
  }
  )
  res.redirect("/");
};



app.listen(4000, () => {
  console.log("Server ready");
});

//NOTES
// HGET returns null if the key does not exist, and the value if it does
// HGET users <username> ... if number returned have login otherwise signup process
//associate the userid to the username in the users hash
//HSET users <username> <userid>
//HSET users <username> <userid>
