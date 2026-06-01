exports.handler = async function(event, context) {
  const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      { headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY } }
    );
    const data = await res.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};