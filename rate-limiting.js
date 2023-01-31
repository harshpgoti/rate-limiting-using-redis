const redis = require('redis')
const redisClient = redis.createClient()
// const redisClient = redis.createClient({url:process.env.REDIS_ENDPOINT_URI})
const moment = require('moment')

module.exports = (req, res, next) => {
  
  redisClient.exists(req.ip, (err, reply) => {
    if (err) {
      console.log("Redis not working...")
      system.exit(0)
    }
    if (reply === 1) {
      
      redisClient.get(req.ip, (err, reply) => {
        
        let data = JSON.parse(reply)
        console.log(" rate limit count: ", data)
        let currentTime = moment().unix()
        let difference = (currentTime - data.startTime) / 60
        
        if (difference >= 1) {
          let body = {
            'count': 1,
            'startTime': moment().unix()
          }
          
          redisClient.set(req.ip, JSON.stringify(body))
          
          next()
        }
        
        if (difference < 1) {
          if (data.count >= 20) {
            let countdown = (60 - ((moment().unix() - data.startTime)))

            let timeLeft = {"time": countdown} 

            return res.status(429).json({error:timeLeft})
          }
        
          data.count++
          redisClient.set(req.ip, JSON.stringify(data))
          next()
        }
      })
      
    } else {
      console.log("added new user")
      
      let body = {
        'count': 1,
        'startTime': moment().unix()
      }
      redisClient.set(req.ip, JSON.stringify(body))
     
      next()
    }
  })
}