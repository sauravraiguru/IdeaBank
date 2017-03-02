/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the 'License'); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


/*eslint-env browser */
/*globals CanvasJS */
'use strict';

require('dotenv').config({
	silent : true
});

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var watson = require('watson-developer-cloud'); // watson sdk
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

var vcapServices = require('vcap_services');
var url = require('url'), bodyParser = require('body-parser'), 
	http = require('http'), 
	https = require('https'),
	numeral = require('numeral');
	
var bankingServices = require('./banking_services');

var CONVERSATION_USERNAME = '',
	CONVERSATION_PASSWORD = '',
	TONE_ANALYZER_USERNAME = '',
	TONE_ANALYZER_PASSWORD = '';

var WORKSPACE_ID = '67c084a7-0f4d-4abc-807f-fc966750f00f';

var LOOKUP_BALANCE = 'balance';
var LOOKUP_TRANSACTIONS = 'transactions';
var LOOKUP_5TRANSACTIONS = '5 transactions';

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

//credentials
var conversation_credentials = vcapServices.getCredentials('conversation');

// Create the service wrapper
var conversation = watson.conversation({
	url : 'https://gateway.watsonplatform.net/conversation/api',
	username : '50622ea1-9165-4916-8f7c-3061f740795c',
	password : 'fVlteMTlNChU',
	version_date : '2016-07-11',
	version : 'v1'
});

/********* R&R *************/
var rnr= require('watson-developer-cloud/retrieve-and-rank/v1');

var retrieve = new rnr({
  password: "JSbxd8GSK5ew",
  username: "a46b94b3-3e45-4cd2-9cd1-b328cb64b82f"
});

var solrClient = retrieve.createSolrClient({
  cluster_id: 'sc54d47a76_fdf2_40f8_92e2_a5d6baecea30',
  collection_name: 'bankfaqRnR',
  wt: 'json'
});


// Endpoint to be called from the client side
app.post('/api/message', function(req, res) {
	var workspace = process.env.WORKSPACE_ID || WORKSPACE_ID;
	
	if ( !workspace || workspace === '<workspace-id>' ) {
		return res.json( {
		  'output': {
			'text': 'Your app is running but it is yet to be configured with a <b>WORKSPACE_ID</b> environment variable. '+
					'These instructions will be provided in your lab handout <b>on the day of your lab.</b>'
			}
		} );
	}
	
	
	bankingServices.getPerson(7829706, function(err, person){
		
		if(err){
			console.log('Error occurred while getting person data ::', err);
			return res.status(err.code || 500).json(err);
		}

		var payload = {
			workspace_id : workspace,
			context : {
				'person' : person
			},
			input : {}
		};

		if (req.body) {
			if (req.body.input) {
				payload.input = req.body.input;
			}
			if (req.body.context) {
				// The client must maintain context/state
				payload.context = req.body.context;
			}

		}
		callconversation(payload);
	
	});
	

	// Send the input to the conversation service
	function callconversation(payload) {
		var query_input = JSON.stringify(payload.input);
		var context_input = JSON.stringify(payload.context);

		
			
					
			conversation.message(payload, function(err, data) {
				if (err) {
					return res.status(err.code || 500).json(err);
				}else{
					console.log('conversation.message :: ',JSON.stringify(data));
					//lookup actions 
					checkForLookupRequests(data, function(err, data){
						if (err) {
							return res.status(err.code || 500).json(err);
						}else{
							return res.json(data);
						}
					});
					
				}
			});
			
			
		
	}

});

/**
*
* Looks for actions requested by conversation service and provides the requested data.
*
**/
function checkForLookupRequests(data, callback){
	console.log('checkForLookupRequests');
	
	if(data.context && data.context.action && data.context.action.lookup && data.context.action.lookup!= 'complete'){
		var workspace = process.env.WORKSPACE_ID || WORKSPACE_ID;
	    var payload = {
			workspace_id : workspace,
			context : data.context,
			input : data.input
		}
		
		//conversation requests a data lookup action
		if(data.context.action.lookup === LOOKUP_BALANCE){
			console.log('Lookup Balance requested');
			//if account type is specified (checking, savings or credit card)
			if(data.context.action.account_type && data.context.action.account_type!=''){
				
				//lookup account information services and update context with account data
				var accounts = bankingServices.getAccountInfo(7829706, data.context.action.account_type, function(err, accounts){
					
					if(err){
						console.log('Error while calling bankingServices.getAccountInfo ', err);
						callback(err,null);
						return;
					}
					var len = accounts ? accounts.length : 0;
				
					var append_account_response = (data.context.action.append_response && 
							data.context.action.append_response === true) ? true : false;
				
				
					var accounts_result_text = '';
				
					for(var i=0;i<len;i++){
						accounts[i].balance = accounts[i].balance ? numeral(accounts[i].balance).format('INR 0,0.00') : '';
					
						if(accounts[i].available_credit)
							accounts[i].available_credit = accounts[i].available_credit ? numeral(accounts[i].available_credit).format('INR 0,0.00') : '';
					
						if(accounts[i].last_statement_balance)
							accounts[i].last_statement_balance = accounts[i].last_statement_balance ? numeral(accounts[i].last_statement_balance).format('INR 0,0.00') : '';
				
						if(append_account_response===true){
							accounts_result_text += accounts[i].number + ' ' + accounts[i].type + ' Balance: '+accounts[i].balance +'<br/>';
						}
					}
				
					payload.context['accounts'] = accounts;
				
					//clear the context's action since the lookup was completed.
					payload.context.action = {};
				
					if(!append_account_response){
						console.log('call conversation.message with lookup results.');
						conversation.message(payload, function(err, data) {
							if (err) {
								console.log('Error while calling conversation.message with lookup result', err);
								callback(err,null);
							}else {
								console.log('checkForLookupRequests conversation.message :: ',JSON.stringify(data));
								callback(null, data);
							}
						});
					}else{
						console.log('append lookup results to the output.');
						//append accounts list text to response array
						if(data.output.text){
							data.output.text.push(accounts_result_text);
						}
						//clear the context's action since the lookup and append was completed.
						data.context.action = {};
						
						callback(null, data);
					
					}
					
				
				});
				
				
			}
			
		}else if(data.context.action.lookup === LOOKUP_TRANSACTIONS){
			console.log('Lookup Transactions requested');
			bankingServices.getTransactions(7829706, data.context.action.category, function(err, transaction_response){
			
				if(err){
					console.log('Error while calling account services for transactions', err);
					callback(err,null);
				}else{
				
					var responseTxtAppend = '';
					if(data.context.action.append_total && data.context.action.append_total === true){
						responseTxtAppend += 'Total = <b>'+ numeral(transaction_response.total).format('INR 0,0.00') + '</b>';		
					}
					
					if(transaction_response.transactions && transaction_response.transactions.length>0){
						//append transactions
						var len = transaction_response.transactions.length;
						for(var i=0; i<len; i++){
							var transaction = transaction_response.transactions[i];
							if(data.context.action.append_response && data.context.action.append_response===true){
								responseTxtAppend += '<br/>'+transaction.date+' &nbsp;'+numeral(transaction.amount).format('INR 0,0.00')+' &nbsp;'+transaction.description;
							}
						}
					}
					if(responseTxtAppend != ''){
						console.log('append lookup transaction results to the output.');
						if(data.output.text){
							data.output.text.push(responseTxtAppend);
						}
						//clear the context's action since the lookup and append was completed.
						data.context.action = {};
					}
					callback(null, data);
					
					//clear the context's action since the lookup was completed.
					payload.context.action = {};
					return;
				}
			
			});
			
		}else if(data.context.action.lookup === LOOKUP_5TRANSACTIONS){
			console.log('Lookup Transactions requested');
			bankingServices.getTransactions(7829706, data.context.action.category, function(err, transaction_response){
			
				if(err){
					console.log('Error while calling account services for transactions', err);
					callback(err,null);
				}else{
				
					var responseTxtAppend = '';
					if(data.context.action.append_total && data.context.action.append_total === true){
						responseTxtAppend += 'Total = <b>'+ numeral(transaction_response.total).format('INR 0,0.00') + '</b>';		
					}
					
					if(transaction_response.transactions && transaction_response.transactions.length>0){
						//append transactions
						var len = 5;//transaction_response.transactions.length;
						for(var i=0; i<len; i++){
							var transaction = transaction_response.transactions[i];
							if(data.context.action.append_response && data.context.action.append_response===true){
								responseTxtAppend += '<br/>'+transaction.date+' &nbsp;'+numeral(transaction.amount).format('INR 0,0.00')+' &nbsp;'+transaction.description;
							}
						}
					}
					if(responseTxtAppend != ''){
						console.log('append lookup transaction results to the output.');
						if(data.output.text){
							data.output.text.push(responseTxtAppend);
						}
						//clear the context's action since the lookup and append was completed.
						data.context.action = {};
					}
					callback(null, data);
					
					//clear the context's action since the lookup was completed.
					payload.context.action = {};
					return;
				}
			
			});
			
		}
		else if(data.context.action.lookup === "rnr"){
			console.log('************** R&R *************** InputText : ' + payload.input.text);
			
			var responseTxtAppend = '';
			
			// search documents
			var query = solrClient.createQuery().q(payload.input.text).rows(3);
			//query.q({ '*' : '*' });
			solrClient.get('fcselect', query, function(err, searchResponse) {
			  if(err) {
			    console.log('Error searching for documents: ' + err);
			    responseTxtAppend = 'Sorry, currently I am unable to respond for this.';
			  } else {
			    console.log('Found ' + searchResponse.response.numFound + ' document(s).');
			    console.log('Document(s): ' + JSON.stringify(searchResponse.response.docs, null, 2));
			    //responseTxtAppend = 'Here are some relevant information for your query.<br/>';
				
					responseTxtAppend  = searchResponse.response.docs[0].contentHtml;
														
			  }
			  if(responseTxtAppend != ''){
					if(data.output.text){
						data.output.text.push(responseTxtAppend);
					}
					//clear the context's action since the lookup and append was completed.
					data.context.action = {};
				}
				callback(null, data);
				
				//clear the context's action since the lookup was completed.
				payload.context.action = {};
				return;
			});
		}
		
		else{
			callback(null, data);
			return;
		}
	}else{
		callback(null, data);
		return;
	}
	
}



  
	
module.exports = app;
