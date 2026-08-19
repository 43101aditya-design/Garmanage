const mysql = require('mysql2/promise');
async function run(){
    const c = await mysql.createConnection({host:'b4eturwt8cnf3b4gqngb-mysql.services.clever-cloud.com',user:'un9gagdyqj29naam',password:'FTasnXdDXtYM64i89fOK',database:'b4eturwt8cnf3b4gqngb',port:3306});
    const [rows] = await c.query("DESCRIBE Mechanic;");
    console.log(rows);
    c.end();
}
run().catch(console.error);
