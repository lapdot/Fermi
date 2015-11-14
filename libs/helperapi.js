/**
 * High level database binding
 * @module libs/helperapi
 * @requires module:libs/dbapi
 */
 
var dbapi = require('./dbapi');

/**
 * Pack first data to callback
 */

function returnOne(callback) {
	return function (err, data) {
		if (err) {
			callback(err);
		} else if (data.length < 1 ) {
			callback(null, null);
		} else {
			callback(null, data[0]);
		}
	}
}

/**
 * Pack all data to callback
 */

function returnAll(callback) {
	return function (err, data) {
		if (err) {
			callback(err);
		} else {
			callback(null, data);
		}
	}
}

/**
 * Find a user by user's id
 */

function findUserById(id, callback) {
	//dbapi.getData('*', 'users', 'users.id = ' + id, returnOne(callback));

	dbapi.gOne(
		['*'], 
		'users', 
		'users.id = ?', 
		[id], 
		callback
	);

	//dbapi.findOne(db, 'users', ['*'], 'users.id = "' + id + '"', callback);
}

/**
 * Find a user by user's primary phone number
 */

function findUserByPhone(phone, callback) {
	//dbapi.getData('*', 'users', 'users.phone1 = "' + phone + '"', returnOne(callback));

	dbapi.gOne(
		['*'],
		'users',
		'users.phone1 = ?',
		[phone],
		callback
	);

	//dbapi.findOne(db, 'users', ['*'], 'users.id = "' + phone + '"',  callback);
}

/**
 * Find an item by item's id
 */

function findItemById(id, callback) {
	//dbapi.getData('*', 'items', 'items.id = ' + id, returnOne(callback));

	dbapi.gOne(
		['*'], 
		'items', 
		'items.id = ?', 
		[id], 
		callback
	);

	//dbapi.findOne(db, 'users', ['*'], 'items.id = "' + id + '"', callback);
}

/**
 * Find a pair of user/item which the user has bought the item
 */

function findUserItemBought(user, item, callback) {
	/*dbapi.getData('*','orders',
		'orders.user_id = ' + user.id + ' AND orders.item_id = ' + item.id,
		returnOne(callback)
	);*/
	dbapi.gOne(
		['*'], 
		'orders', 
		'orders.user_id = ? AND orders.item_id = ?', 
		[user.id, item.id], 
		callback
	);
	//dbapi.findOne(db, 'orders', ['*'], 'user_id = "' + user.id + '" AND item_id = "' + item.id + '"', callback);
}

/**
 * Find a pair of user/item which the user put the item into the cart
 */

function findUserItemInCart(user, item, callback) {
	/*dbapi.getData('*','orders_in_cart',
		'orders_in_cart.user_id = ' + user.id + ' AND orders_in_cart.item_id = ' + item.id,
		returnOne(callback)
	);*/
	dbapi.gOne(
		['*'], 
		'orders_in_cart', 
		'orders_in_cart.user_id = ? AND orders_in_cart.item_id = ?', 
		[user.id, item.id], 
		callback
	);
}

/**
 * Find all users which have bought the item
 */

function listUsersByItemBought(item, callback) {
	/*dbapi.getData(
		'users.*',
		'orders INNER JOIN users ON orders.user_id = users.id',
		'orders.item_id = ' + item.id,
		returnAll(callback)
	);*/
	dbapi.gAll(
		['users.*'], 
		'orders INNER JOIN users ON orders.user_id = users.id', 
		'orders.item_id = ?', 
		[item.id], 
		callback
	);
}

/**
 * Find all items which have been bought by the user
 */

function listItemsBoughtByUser(user, callback) {
	/*dbapi.getData(
		'items.*',
		'orders INNER JOIN items ON orders.item_id = items.id',
		'orders.user_id = ' + user.id, 
		returnAll(callback)
	);*/
	dbapi.gAll(
		['items.*'], 
		'orders INNER JOIN items ON orders.item_id = items.id', 
		'orders.user_id = ?',
		[user.id], 
		callback
	);
}

/**
 * Find all items which have been put into the cart by the user
 */

function listItemsInCartByUser(user, callback) {
	/*dbapi.getData(
		'items.*',
		'orders_in_cart INNER JOIN items ON orders_in_cart.item_id = items.id',
		'orders_in_cart.user_id = ' + user.id,
		returnAll(callback)
	);*/
	dbapi.gAll(
		['items.*'], 
		'orders_in_cart INNER JOIN items ON orders_in_cart.item_id = items.id', 
		'orders_in_cart.user_id = ?',
		[user.id], 
		callback
	);
}

/**
 * Find all items which are in the list
 */

function listItemsByListId(list_id, callback) {
	/*dbapi.getData(
		'items.*',
		'item_lists INNER JOIN items ON item_lists.item_id = items.id',
		'item_lists.list_id = ' + list_id,
		returnAll(callback)
	);*/
	dbapi.gAll(
		['items.*'],
		'item_lists INNER JOIN items ON item_lists.item_id = items.id',
		'item_lists.list_id = ?',
		[list_id],
		callback
	);
}

module.exports = {
	/**
	 * Refer to the inner findUserById method
	 */
	findUserById: findUserById,
	/**
	 * Refer to the inner findUserByPhone method
	 */
	findUserByPhone: findUserByPhone,
	/**
	 * Refer to the inner findItemById method
	 */
	findItemById: findItemById,
	/**
	 * Refer to the inner findUserItemBought method
	 */
	findUserItemBought: findUserItemBought,
	/**
	 * Refer to the inner findUserItemInCart method
	 */
	findUserItemInCart: findUserItemInCart,
	/**
	 * Refer to the inner listUsersByItemBought method
	 */
	listUsersByItemBought: listUsersByItemBought,
	/**
	 * Refer to the inner listItemsBoughtByUser method
	 */
	listItemsBoughtByUser: listItemsBoughtByUser,
	/**
	 * Refer to the inner listItemsInCartByUser method
	 */
	listItemsInCartByUser: listItemsInCartByUser,
	/**
	 * Refer to the inner listItemsByListId method
	 */
	listItemsByListId: listItemsByListId
};