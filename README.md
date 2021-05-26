Week 9 of https://thejsbootcamp.com/
DATABASES & INTERFACING WITH DATABASES USING NODE.JS

## Redis
sudo apt-get install redis-server
In order to specify a config file use redis-server /path/to/redis.conf
Set password.
In seperate terminal run redis-cli. (127.0.0.1:6379> )

Hashes let us associate more than one value to a single key.



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
