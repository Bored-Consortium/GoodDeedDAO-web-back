import sqlite from "sqlite3"
sqlite.verbose();


class DatabaseDobra {
    private db: sqlite.Database;
    
    constructor(pathToFile: string) {
        this.db = new sqlite.Database(pathToFile, (err: Error | null) => {
            if (err) {
                console.log('Could not connect to database', err)
            } else {
                console.log('Connected to database')
            }
        });
        this.create_tables();
    }
    
    create_tables () {
        let qry;
        qry = `CREATE TABLE IF NOT EXISTS USERS (id_user INTEGER PRIMARY KEY, user_name	TEXT, karma INTEGER, deeds INTEGER, validations INTEGER)`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    
        qry = `CREATE TABLE IF NOT EXISTS DEEDS (id_deed TEXT PRIMARY KEY, upvote INTEGER, downvote INTEGER, is_validated INTEGER, description TEXT, type TEXT)`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    
        qry = `CREATE TABLE IF NOT EXISTS DEED_BY_USER (id_user INTEGER, id_deed TEXT, id_msg INTEGER)`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    
        qry = `CREATE TABLE IF NOT EXISTS VOTES (id_user INTEGER, ` +
                                                `id_deed TEXT, ` +
                                                `vote INTEGER, ` +
                                                `status INTEGER, ` +
                                                `PRIMARY KEY (id_user, id_deed)` +
                                                `);`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    select_data_from_table(table: string, condition: string, value: string, callback: any) {
        const qry = `SELECT * FROM ${table} WHERE ${condition}=${value};`;
        console.log(`select_data_from_table called with qry: ${qry}`);
        this.db.all(qry, [], (err: Error, results: any) => {
            if (err) return console.error(err.message);
            callback(results);
        });
    }
    
    select_row_from_table(table: string, condition: string, value: number | string, callback: any) {
        const qry = `SELECT * FROM ${table} WHERE ${condition}=${value}`;
        console.log(`select_row_from_table qry: ${qry}`)
        this.db.get(qry, [], (err: Error, r: any) => {
            if (err) return console.error(err.message);
            callback(r);
        });
    }
    
    insert_data(table: string, fields: string, values: string, callback: any) {
        let qry;
        qry = `INSERT INTO ${table}(${fields}) VALUES(${values})`;
        console.log(`insert_data qry: ${qry}`)
        this.db.run(qry, [], (err: Error) => {
            callback(err);
        });
    }
    
    update_votes(id_deed: string, column: string) { // TODO replace column type to enum type
        let qry;
        qry = `UPDATE DEEDS SET ${column} = ${column}+1 WHERE id_deed='${id_deed}';`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    update_voting_result(id_deed: string, result: number) { // TODO replace result type with enum type
        let qry;
        qry = `UPDATE DEEDS SET is_validated=${result} WHERE id_deed='${id_deed}';`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    update_karma(id_user: number, karma: number) {
        let qry;
        qry = `UPDATE USERS SET karma = karma+${karma} WHERE id_user='${id_user}';`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    update_add_deed(id_user: number) {
        let qry;
        qry = `UPDATE USERS SET deeds = deeds+1 WHERE id_user='${id_user}';`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    update_add_validations(id_user: number) {
        let qry;
        qry = `UPDATE USERS SET validations = validations+1 WHERE id_user='${id_user}';`;
        this.db.run(qry, [], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    delete_data(table: string, field: string, value: number | string) {
        let qry;
        qry = 'DELETE FROM ? WHERE ? = ?';
        // Example: 'DELETE FROM users WHERE id = value';
        this.db.run(qry, [table, field, value], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }
    
    drop_table (table: string) {
        this.db.run('DROP TABLE ?', [table], (err: Error) => {
            if (err) return console.error(err.message);
        });
    }

}


const dobroDb = new DatabaseDobra('./data_folder/gooddeeds.db')
export default dobroDb