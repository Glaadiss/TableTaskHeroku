
var express = require('express');
var app = express();
var nodemailer = require("nodemailer");
var client = require('twilio')('ACc486bac0b2e90d2077f3a5524c1bbb96','62e2bff49eea456d3afc356d40d9e2dd');
//var io = require('socket.io')(app.createServer());
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var sessions = require('client-sessions');
var bcrypt = require('bcryptjs');
mongoose.connect('mongodb://localhost/tabletask');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var User = mongoose.model('User', new Schema({
	email: {type: String, unique: true},
	passwd: String,
	phone: String
}));

var Task = mongoose.model('Task', new Schema({
	email: String, 
	topic: String,
	content: String,
	date: String, 
	time: String,
	phone: String
}));

var expressHbs = require('express3-handlebars');
var panel  = __dirname+'/views/panel';
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth:{
		user: 'gladysbartek',
		pass: '96120707' 
	}
});

function remov(id){

}

var toDelete = [];
setInterval(function(){
	var date = new Date();
	//console.log(date);
	var result ={};
	var elaspedTime = date.getTime();
	Task.find({}, function(err,tasks){
		
	    tasks.forEach(function(task) {
	    	var datee = new Date();
	    	datee.setSeconds(00); 
	    	datee.setHours(task.time.slice(0,2));
	    	datee.setMinutes(task.time.slice(3,5));
	    	var year = task.date.toString();
	    	var month = year.slice(0,2);
	    	month = parseInt(month);
	    	month-=1;
	    	if(month<10){
	    		month = '0'+month.toString();
	    	}
	    	else{
	    		month = month.toString();
	    	}
	    	datee.setFullYear(year.slice(6,10), month , year.slice(3,5));
	    	var substr = Math.abs(elaspedTime - datee.getTime());
	    	if(substr<=10000 ){
	    		toDelete.push(task.id);

	    		client.sendMessage({
	    			to: '+48'+'514373276',
	    			from: '+48'+'718810760',
	    			body: task.content
	    		}, function(err,data){
	    			if(err){
	    				console.log(err);
	    			}
	    			else
	    				console.log(data);
	    		});

	    		var mailOptions = {
				    to: task.email, // list of receivers
				    subject: task.topic, // Subject line
				    text: task.content, // plaintext body
				    html: '<h3><p>'+task.content+'</p></h3>' // html body
				};

				transporter.sendMail(mailOptions, function(error, info){
					if(error){
						console.log(error);
					}
					else{
						console.log('Message sent: ' + info.response);
					}
				});

	    	}
		});
	});

},10000);

app.engine('handlebars', expressHbs({defaultLayout:'main'}));
app.set('view engine', 'handlebars');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(sessions({
	cookieName: 'session',
	secret: 'sfad7sa61hsad717f12',
	durration: 60 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
	httpOnly: true,
	secure: true,
	ephermal: true
}))

app.use(function(req,res,next){
	if(req.session && req.session.user){
		User.findOne({email: req.session.user.email}, function(err,user){
			if(user){
				req.user = user;
				delete req.user.passwd;
				req.session.user = req.user;
				res.locals.user = req.user
			}
			next();
		})
	}
	else{
		next();
	}
});

function requireLogin(req,res,next){
	if(!req.user){
		res.redirect('/');
	}
	else{
		next();
	}
}

app.get('/',function(req, res){							 
    res.render(__dirname + '/views/index');	//main file
  });
app.get('/panel', requireLogin,  function(req,res){
		//var taskMap = {};
		var result ={};
		Task.find({email: req.session.user.email}, function(err,tasks){
		    tasks.forEach(function(task) {
      			result[task._id]=task;
    		});
    		console.log(result);
			res.render(panel, {
				email: req.session.user.email,
				result: result
		});
		})

})
app.post('/register',function(req,res){
	var hash = bcrypt.hashSync(req.body.passwd, bcrypt.genSaltSync(10));
	var user = new User({
		email: req.body.email,
		passwd: hash,
		phone: req.body.phone
	})
	user.save(function (err){
		if(err){
			var err = ' Coś nie działa :C';
			if(err.code === 11000){
				var err = 'Niestety, ten adres email jest już zajęty';
			}
		}
		else{
			res.redirect('/');
		}
	});
});
app.post('/login',function(req,res){
	User.findOne({email: req.body.email},function(err,user){
		if(!user){
			res.redirect('/');
		}
		else{
			if(bcrypt.compareSync(req.body.passwd, user.passwd)){
				req.session.user = user;
				res.redirect('/panel');
			}
			else{
				res.redirect('/');	
			}
		}
		

	});


});

app.post('/new',function(req,res){
	var task = new Task({
		phone: req.session.user.phone,
		email: req.session.user.email, 
		topic: req.body.topic,
		content: req.body.content,
		date: req.body.date, 
		time: req.body.time
	});
	task.save(function(err){
		if(err){
			var err = 'coś nie działa';
		}
		else{
			res.redirect('/panel')
		}

	})
});

app.get('/logout',function(req,res){
	req.session.reset();
	res.redirect('/');
});

app.listen(3002,function(){
    console.log("Express Started on Port 3002");
});

