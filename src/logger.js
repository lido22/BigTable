let fs = require('fs');
let util = require('util');
let log_file,log_stdout;
let openLog =function(logFileName){
     log_file = fs.createWriteStream(__dirname + '/'+logFileName, {flags : 'w'});
     log_stdout = process.stdout;
   
} 
let log = function(d) {
    let date = new Date 
    // d= `"${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}"`+" : "+d
    log_file.write(util.format(d) + '\n');
    // log_stdout.write(util.format(d) + '\n');

};
module.exports ={openLog,log};