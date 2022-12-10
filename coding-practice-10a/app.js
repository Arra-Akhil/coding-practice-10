const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//login API

const convertStatesObjectDbToResponseObjectDB = (dbObject) => {
    return{
        stateId:dbObject.state_id,
        stateName:dbObject.state_name,
        population:dbObject.population
    };
};

const convertDistrictObjectDbToResponseObjectDB = (dbObject) => {
    return{
        districtId:dbObject.district_id,
        districtName:dbObject.district_name,
        stateId:dbObject.state_id,
        cases:dbObject.cases,
        cured:dbObject.cured,
        active:dbObject.active,
        deaths:dbObject.deaths
    };
};



app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  console.log(username, password);
  const selectUserQuery = `select * from user where username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "akhilarra11@gmail.com");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});


//If the token is not provided by the user or an invalid token status code 401 and Invalid JWT Token

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if(authHeader !== undefined){
       jwtToken = authHeader.split(" ")[1];
    }
    if(jwtToken === undefined){
        response.status(400);
        response.send("Invalid JWT Token");
    }else{
        jwt.verify(jwtToken, "akhilarra11@gmail.com", async(error, payload) => {
            if(error){
                response.status(400);
                response.send("Invalid JWT Token");
            }else{
                next();
            }
        });

    }
}


//GET states API 
app.get("/states/", authenticateToken, async(request, response) => {
    const selectStatesQuery = `SELECT * FROM state;`;
    const dbResponse = await db.all(selectStatesQuery);
    response.send(dbResponse.map(state => (convertStatesObjectDbToResponseObjectDB(state))));
});



//GET state based on stateId API 
app.get("/state/:stateId/", authenticateToken, async(request, response) => {
    const {stateId} = request.params;
    const getStateQuery = `SELECT * FROM state where state_id = ${stateId};`;
    const dbResponse = await db.get(getStateQuery);
    response.send(convertStatesObjectDbToResponseObjectDB(dbResponse));
})


//CREATE districts API 
app.post("/districts/", authenticateToken, async(request, response) => {
   const {districtName, stateId, cases, cured, active, deaths} = request.body;
   const createDistrictQuery = `INSERT INTO district
        (district_name, state_id, cases, cured, active, deaths)    
        VALUES
        ('${districtName}',
         ${stateId},
         ${cases},
         ${cured},
         ${active},
         ${deaths}
            );`;

    await db.run(createDistrictQuery);
    response.send("District Successfully Added");
})


//GET a district based on districtId API 
app.get("/districts/:districtId/", authenticateToken, async(request, response) => {
    const {districtId} = request.params;

    const getDistrictQuery = `SELECT * FROM district where district_id=${districtId};`;

    const district = await db.get(getDistrictQuery);
    response.send(convertDistrictObjectDbToResponseObjectDB(district));
});


//DELETE district based on districtId API 
app.delete("/district/:districtId/", authenticateToken, async(request,response)=>{
  const {districtId} = request.params;
  const deleteDistrictQuery = `DELETE FROM district where district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//Update district API
app.put("/district/:districtId/", authenticateToken, async(request, response)=>{
    const {districtId} = request.params;
    const {districtName, stateId, cases, cured, active, deaths} = request.body;

    const updateDistrictQuery = `UPDATE DISTRICT 
       SET 
       district_name = '${districtName}',
       stateId = ${stateId},
       cases = ${cases},
       cured = ${cured},
       active = ${active},
       deaths = ${deaths}
       where district_id = ${districtId};`;
    
    await db.run(updatedDistrictQuery);
    response.send("District Details Updated");
});

//get Stats of a Stats API
app.get("/states/:stateId/stats/", authenticateToken, async(request, response) => {
    const {stateId} = request.params;
    const selectStatesQuery = `SELECT sum(cases) as totalCases,
                               sum(cured) as totalCured,
                               sum(active) as totalActive,
                               sum(deaths) as totalDeaths
                        FROM district where state_id = ${stateId};`;
    const deResponse = await db.get(selectStatesQuery);
    response.send(dbResponse);
})

