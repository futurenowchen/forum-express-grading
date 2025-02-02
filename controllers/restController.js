const db = require('../models')
const Restaurant = db.Restaurant
const Category = db.Category
const Comment = db.Comment
const User = db.User
const Favorite = db.Favorite
const pageLimit = 10
const favoriteCount = 10
const Sequelize = require('sequelize')


const restController = {
  getRestaurants: (req, res) => {
    let offset = 0
    const whereQuery = {}
    let categoryId = ''
    if (req.query.page) {
      offset = (req.query.page - 1) * pageLimit
    }
    if (req.query.categoryId) {
      categoryId = Number(req.query.categoryId)
      whereQuery.categoryId = categoryId
    }
    Restaurant.findAndCountAll({
      include: Category,
      where: whereQuery,
      offset: offset,
      limit: pageLimit
    }).then(result => {
      // data for pagination
      const page = Number(req.query.page) || 1
      const pages = Math.ceil(result.count / pageLimit)
      const totalPage = Array.from({ length: pages }).map((item, index) => index + 1)
      const prev = page - 1 < 1 ? 1 : page - 1
      const next = page + 1 > pages ? pages : page + 1

      // clean up restaurant data
      const data = result.rows.map(r => ({
        ...r.dataValues,
        description: r.dataValues.description.substring(0, 50),
        categoryName: r.dataValues.Category.name,
        isFavorited: req.user.FavoritedRestaurants.map(d => d.id).includes(r.id),
        isLiked: req.user.LikedRestaurants.map(d => d.id).includes(r.id)
      }))
      Category.findAll({
        raw: true,
        nest: true
      }).then(categories => {
        return res.render('restaurants', {
          restaurants: data,
          categories: categories,
          categoryId: categoryId,
          page: page,
          totalPage: totalPage,
          prev: prev,
          next: next
        })
      })
    })
  },

  getRestaurant: (req, res) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: User, as: 'FavoritedUsers' },
        { model: User, as: 'LikedUsers' },
        { model: Comment, include: [User] }
      ]
    }).then(restaurant => {
      const isFavorited = restaurant.FavoritedUsers.map(d => d.id).includes(req.user.id)
      const isLiked = restaurant.LikedUsers.map(d => d.id).includes(req.user.id)

      if (!restaurant.viewCounts) {
        restaurant.viewCounts = 1
        restaurant.save()
      } else {
        restaurant.viewCounts += 1
        restaurant.save()
      }
      console.log(restaurant.viewCounts)
      return res.render('restaurant', {
        restaurant: restaurant.toJSON(),
        isFavorited: isFavorited,
        isLiked: isLiked
      })

    })
  },

  getRestaurantDashboard: (req, res) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment, include: [User] }
      ]
    }).then(restaurant => {
      const totalComment = restaurant.dataValues.Comments.length
      const viewCounts = restaurant.viewCounts
      return res.render('restaurantDashboard', {
        restaurant: restaurant.toJSON(),
        totalComment: totalComment,
        viewCounts: viewCounts
      })
    })
  },

  getFeeds: (req, res) => {
    return Promise.all([
      Restaurant.findAll({
        limit: 10,
        raw: true,
        nest: true,
        order: [['createdAt', 'DESC']],
        include: [Category]
      }),
      Comment.findAll({
        limit: 10,
        raw: true,
        nest: true,
        order: [['createdAt', 'DESC']],
        include: [User, Restaurant]
      })
    ]).then(([restaurants, comments]) => {
      return res.render('feeds', {
        restaurants: restaurants,
        comments: comments
      })
    })
  },

  getTopRestaurant: (req, res) => {
    Favorite.findAll({
      raw: true,
      limit: favoriteCount,
      order: [[Sequelize.literal('FavoriteCount'), "DESC"]],
      attributes: [
        [Sequelize.fn('count', Sequelize.col('UserId')), 'FavoriteCount']
      ],
      group: ['RestaurantId'],
      include: [
        {
          model: Restaurant,
          as: 'Restaurant'
        }
      ]
    })
      .then(restaurants => {
        restaurants = restaurants.map(item => ({
          id: item['Restaurant.id'],
          name: item['Restaurant.name'],
          image: item['Restaurant.image'],
          description: item['Restaurant.description'].substring(0, 50),
          favoritedCount: item.FavoriteCount,
          isFavorited: req.user.FavoritedRestaurants.map(d => d.id).includes(item['Restaurant.id'])
        }))
        return res.render('topRestaurant', { restaurants })
      })
  }

}
module.exports = restController