const path = require("path")
const express = require("express");
const app = express();
const util = require('util');
const exec = require('await-exec')
const fs = require('fs')
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './views')));
app.use(express.static(path.join(__dirname, './css')));

var session = require('express-session');
const maxAge = 1000*60*60;
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: maxAge }
}));

const upload = require("./upload.js");
const { dirname } = require("path");
app.set('view engine', 'ejs');

const port = process.env.PORT || 3000;


setInterval(() => {
  try {
    if (fs.existsSync(path.resolve(__dirname,'./upload')))
      fs.readdir(path.resolve(__dirname,'./upload'), (err, filenames) => {
        filenames.forEach(filename => {
          if(Date.now()-Number(filename.split('_')[0]) >= maxAge)
              fs.unlinkSync(path.resolve(__dirname,'./upload/'+filename));
        });
      });
    if (fs.existsSync(path.resolve(__dirname,'./results')))
      fs.readdir(path.resolve(__dirname,'./results'), function(err, filenames){
        filenames.forEach(filename => {
          if(Date.now()-fs.statSync(path.resolve(__dirname,'./results/'+filename)).mtime.getTime() >= maxAge)
              fs.unlinkSync(path.resolve(__dirname,'./results/'+filename));
        });
      });
  }
  catch(err) {
    console.error(err)
  }
},maxAge*1.5);


app.get('/', (req, res) => {

    if(!req.session.fileNames)
      req.session.fileNames = [];
    console.log('-----GET HOME-------');
    // console.log(req.sessionID);
    // console.log(req.session);
    return res.render(path.resolve(__dirname,'./views/index.ejs'));
});


async function python_call(res,pyfile,datafiles)
{
  await exec("python3 "+path.resolve(__dirname, './search_engines/'+pyfile+' '+datafiles), (error, stdout, stderr) => {
  if (error) {
      console.log(`error: ${error.message}`);
      return res.send(`error: ${error.message}`);
  }
  if (stderr) {
      console.log(`stderr: ${stderr}`);
      return res.send(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
  
  });
  
}

app.post('/upload', async (req, res) => {
  console.log('-----POST UPLOAD-------');
  // console.log(req.sessionID);
  // console.log(req.session);
  
  req.session.converted = false;
  // converted = false;
    // console.log('start of post');
  var dir = path.resolve(__dirname,'./upload');
  console.log(dir);
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  
  try {
    await upload(req, res);
    // console.log(req.files);
    // console.log(req.files.filename);

    if (req.files.length <= 0) {
      return res.send(`You must select at least 1 file.`);
    }
    req.session.fileNames = req.files.map((obj)=>{return obj.filename})
    var originalfileNames = req.session.fileNames.map((filename)=>{return filename.split("_#_")[1];})
    res.render('search', {data:originalfileNames});

    } catch (error) {
    console.log(error);

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.send("Too many files to upload.");
    }
    else if(error.code === "LIMIT_FILE_SIZE")
    {
      return res.send("Large file size.")
    }
    else
    return res.send(`Error when trying upload many files: ${error}`);
  }

});


app.get('/upload',async (req,res)=>{ 
  console.log('-----GET UPLOAD-------');
  // console.log(req.sessionID);
  // console.log(req.session);
  // console.log(res.query.search);
  if(!req.query.search || !req.session.fileNames ||req.session.fileNames.length === 0)
  {
    return res.redirect('/');
  }

  if(req.query.search.trim() === '')
  {
    return res.render('results',{data:''});
  }
  // docx (if any) to txt 
  if(!req.session.converted)
  {
    // console.log(req.session.fileNames);
    var docxfiles = [];
    var otherfiles = [];
    for(var name of req.session.fileNames)
    {
      var sp = name.split(".");
      if(sp[sp.length-1] === "docx")
        {docxfiles.push(name);
        otherfiles.push(sp[0]+'.txt')}
      else
        otherfiles.push(name);

    }
    if(docxfiles.length != 0)
    {
      docxfiles = docxfiles.join()
      await python_call(res,'convert_docx_to_txt.py',docxfiles)
      req.session.fileNames = otherfiles;
    }
    req.session.converted = true;
  }
  
  if(req.query.byname)
  {
    await python_call(res,'filter.py',req.session.fileNames.join()+" "+req.query.search+" 2")
  }
  else
  {
    await python_call(res,'filter.py',req.session.fileNames.join()+" "+req.query.search+" 1");
    if(req.query.sortadd)
    {
      console.log('sortadd');
    }
  }

  var data = fs.readFileSync(path.resolve(__dirname,'./results/'+req.query.search.toUpperCase() + '_ALL'));
  return res.render('results',{data:data});
});


app.listen(port, () => {
  console.log(`Running at localhost:${port}`);
});