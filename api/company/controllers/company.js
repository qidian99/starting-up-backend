'use strict';


/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  async myCompanies(ctx) {
    const userId = ctx.state.user.id;
    const companies = await strapi.query('company').find({
      user: userId
    });
    return companies;
  },

  async createCompany(ctx) {
    const { name, strategy } = ctx.request.body
    const user = ctx.state.user._id;

    console.log({
      name, strategy, user,
    });

    const company = await strapi.query('company').create({
      name, strategy, user
    });

    return company
  }

};
