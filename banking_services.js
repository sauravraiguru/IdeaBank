/*eslint-env browser */
var banking_services = {
	
	
			
   


	_person : {
		fname : 'Natalie',
		lname : 'Smith',
		address : {
			line1 : 'B 101 Amar CHS Ltd',
			line2 : 'Bandra West',
			city : 'Mumbai',
			state : 'MH',
			zip : 400001,
			country : 'India'
		},
		customer_id : 7829706,
		tone_anger_threshold : 0.49
	},
	
	getPerson : function(customerId, callback) {
		callback(null, this._person);
	},
	
	_accounts : [ {
		balance : 12800,
		number : 'xxx8990',
		type : 'savings'
	}, {
		balance : 7600,
		number : 'xxx0744',
		type : 'current'
	}, {
		balance : 550,
		number : 'xxx7685',
		type : 'credit card',
		available_credit : 4450,
		payment_due_date : '25 Nov, 2016',
		last_statement_balance : 550
	},{
		balance : 550,
		number : 'xxx7685',
		type : 'prepaid account',
		available_credit : 4450,
		payment_due_date : '25 Nov, 2016',
		last_statement_balance : 550
	} ],
	
	getAccountInfo : function(customerId, account_type, callback) {
		// console.log('getAccountInfo :: start');
		var accounts = [];
		

		switch (account_type) {
		case 'savings':
			accounts.push(this._accounts[0])
			break;
		case 'current':
			accounts.push(this._accounts[1])
			break;
		case 'credit card':
			accounts.push(this._accounts[2])
			break;
		default:
			accounts = this._accounts.slice();
		}

		// console.log('Returning account info ',
		// JSON.stringify(accounts,null,2));

		callback(null, accounts);

	},
	
	getTransactions : function(customerId, category, callback) {

		var response = {
			total : '',
			category : 'all',
			transactions : []
		};

		var len = this._transactions ? this._transactions.length : 0;
		var total = 0;

		var category_specified_bool = false;
		if (category && category !== '' && category !== 'all') {
			category_specified_bool = true;
			response.category = category;
		}

		for (var i = 0; i < len; i++) {
			var transaction = this._transactions[i];
			if (category_specified_bool && transaction.category === category) {
				response.transactions.push(transaction);
				total += transaction.amount;
			} else if (!category_specified_bool) {
				total += transaction.amount;
			}
		}

		response.total = total;
		if (!category_specified_bool) {
			response.transactions = this._transactions.slice();
		}

		callback(null, response);
	},

	_transactions : [ {
		amount : 700.00,
		account_number : 'xxx7685',
		category : 'dining',
		description : 'Sweekar Restaurant',
		type : 'debit',
		date : '08-29-2016'
	}, {
		amount : 500.00,
		account_number : 'xxx7685',
		category : 'dining',
		description : 'McDonalds',
		type : 'debit',
		date : '08-27-2016'
	}, {
		amount : 2000.90,
		account_number : 'xxx7685',
		category : 'grocery',
		description : 'DMart',
		type : 'debit',
		date : '08-26-2016'
	}, {
		amount : 1500,
		account_number : 'xxx7685',
		category : 'grocery',
		description : 'Hyper City',
		type : 'debit',
		date : '08-24-2016'
	}, {
		amount : 5000.00,
		account_number : 'xxx7685',
		category : 'travel',
		description : 'Air India',
		type : 'debit',
		date : '08-24-2016'
	}, {
		amount : 1000.00,
		account_number : 'xxx7685',
		category : 'fuel',
		description : 'Indian Oil',
		type : 'debit',
		date : '08-20-2016'
	}, {
		amount : 800.00,
		account_number : 'xxx7685',
		category : 'utility',
		description : 'BSNL',
		type : 'debit',
		date : '09-16-2016'
	}, 
	{
		amount : 700.00,
		account_number : 'xxx7685',
		category : 'utility',
		description : 'BSNL',
		type : 'debit',
		date : '08-16-2016'
	}, 
	{
		amount : 500.00,
		account_number : 'xxx7685',
		category : 'utility',
		description : 'Mahanagar Gas Ltd',
		type : 'debit',
		date : '08-16-2016'
	},
	{
		amount : 1000.00,
		account_number : 'xxx7685',
		category : 'utility',
		description : 'Mahanagar Gas Ltd',
		type : 'debit',
		date : '09-16-2016'
	},
	{
		amount : 6000.00,
		account_number : 'xxx7685',
		category : 'Finance',
		description : 'SBI Mutual Fund',
		type : 'debit',
		date : '09-25-2016'
	},
	{
		amount : 10000.00,
		account_number : 'xxx7685',
		category : 'fees',
		description : 'Annual Fee',
		type : 'debit',
		date : '08-15-2016'
	} ],
	
	

}

module.exports = banking_services;
