const express = require('express')
const cors = require("cors");
const pg = require('pg')

const app = express()

const pool = new pg.Pool({
  host: 'work-samples-db.cx4wctygygyq.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'readonly',
  database: 'work_samples',
  password: 'w2UIO@#bg532!',
})
const rateCheck = require("./rate-limiting");
const queryHandler = (req, res, next) => {
  pool.query(req.sqlQuery).then((r) => {
    return res.json(r.rows || [])
  }).catch(next)
}

app.use(cors());
app.use(rateCheck);
app.use(express.static("public"));
app.set("trust proxy", true);

app.get('/', (req, res) => {
  res.send('Welcome to rate limiting using redis demo')
})

app.get('/events/hourly', (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, events
    FROM public.hourly_events
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)

app.get('/events/daily', (req, res, next) => {
  req.sqlQuery = `
    SELECT date, SUM(events) AS events
    FROM public.hourly_events
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

app.get('/stats/hourly', (req, res, next) => {
  req.sqlQuery = `
    SELECT date, hour, impressions, clicks, revenue
    FROM public.hourly_stats
    ORDER BY date, hour
    LIMIT 168;
  `
  return next()
}, queryHandler)


app.get('/stats/hourlyevents', (req, res, next) => {
  const generalQuery = `
    SELECT *
    FROM public.hourly_stats
    INNER JOIN public.poi ON public.poi.poi_id=public.hourly_stats.poi_id
    ORDER BY date, hour
    LIMIT 168;
  `
    let day = req.query.day
    
    let selectedDay = `
    SELECT *
    FROM public.hourly_stats
    INNER JOIN public.poi ON public.poi.poi_id=public.hourly_stats.poi_id
    WHERE date ='${day}T00:00:00.000Z'
    ORDER BY date, hour
    LIMIT 168;
  `
    req.sqlQuery = req.query.day ? selectedDay : generalQuery
  return next()
}, queryHandler)


app.get('/stats/daily', (req, res, next) => {
  req.sqlQuery = `
    SELECT date,
        SUM(impressions) AS impressions,
        SUM(clicks) AS clicks,
        SUM(revenue) AS revenue
    FROM public.hourly_stats
    GROUP BY date
    ORDER BY date
    LIMIT 7;
  `
  return next()
}, queryHandler)

app.get('/poi', (req, res, next) => {
  req.sqlQuery = `
    SELECT *
    FROM public.poi;
  `
  return next()
}, queryHandler)

app.listen(process.env.PORT || 5555, (err) => {
  if (err) {
    console.error(err)
    process.exit(1)
  } else {
    console.log(`Running on ${process.env.PORT || 5555}`)
  }
})

// last resorts
process.on('uncaughtException', (err) => {
  console.log(`Caught exception: ${err}`)
  process.exit(1)
})
process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  process.exit(1)
})
