'use strict';
const db = require('../models')
const User = db.User
const Restaurant = db.Restaurant
const getSeederId = new Promise((resolve, reject) => {
  User.findOne({ where: { name: 'user1' } }, { raw: true, nest: true })
    .then(user => {
      return resolve(user.id)
    })
})
const getRestaurantId = new Promise((resolve, reject) => {
  Restaurant.findAll({ raw: true, nest: true })
    .then(restaurants => {
      const restaurantIds = []
      restaurants.forEach(restaurant => {
        restaurantIds.push(restaurant.id)
      })
      return resolve(restaurantIds)
    })
})

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const seederId = await getSeederId
    const restaurantIds = await getRestaurantId
    await queryInterface.bulkInsert('Comments',
      ['這實在太好吃了！', '十分棒的飲料', '超級美味', '廚神！', '吃一口，就漫出來了！', '如果你沒吃過這間，你不知道什麼叫做悲劇', '不知道我的人生比較悲劇，還是這間餐廳的餐點...']
        .map((item, index) =>
        ({
          id: index * 10 + 1,
          text: item,
          UserId: seederId,
          RestaurantId: restaurantIds[Math.floor(Math.random() * restaurantIds.length)],
          createdAt: new Date(),
          updatedAt: new Date()
        })
        ), {})
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Comments', null, {})
  }
}
