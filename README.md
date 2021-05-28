Week 9 of https://thejsbootcamp.com/
DATABASES & INTERFACING WITH DATABASES USING NODE.JS

## Redis
sudo apt-get install redis-server
In order to specify a config file use redis-server /path/to/redis.conf
Set password.
In seperate terminal run redis-cli. (127.0.0.1:6379> )

Hashes let us associate more than one value to a single key.

TablePlus to visualize your Redis database.



## Pug

Tailwind UI provides HTML for styling which we convert to Pug (template engine).
https://html-to-pug.com/

## bcrypt

```
const saltRounds = 10
const hash = await bcrypt.hash('PASSWORD', saltRounds)
const result = await bcrypt.compare('PASSWORD', hash)
//result is true or false
```

## Node.js
Promisify functions that do not support promises. Which enables async/await syntax.
const { promisify } = require('util')

```
//Implement followers/following logic

//without async/await
  {
    redis_client.hget(`user:${req.session.userid}`,
    "username", (err, currentUserName)=>{
      redis_client.smembers(`following:${currentUserName}`,(err,following)=>{
        redis_client.hkeys("users",(err,users)=>{
          res.render("dashboard", {users: users.filter(
            (user)=>{
              user !== currentUserName && following.indexOf(user) === -1
            }
          )
        });
        });
      });
    })
  }

//with async/await
  const currentUserName = await ahget(`user: ${req.session.userid}`,"username");
  const following = await asmembers(`following:${currentUserName}`);
  const users = await ahkeys("users");

```

data-fns library
```
//generate strings like “10 minutes ago” from a UNIX timestamp
npm install date-fns
const { formatDistance } = require("date-fns")
```