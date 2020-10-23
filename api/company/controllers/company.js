'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {

  async createCompany(ctx) {
    const { name, strategies } = ctx.request.body
    const user = ctx.state.user._id;


    console.log({
      name, strategies, user,
    });

    const company = await strapi.query('company').create({
      name, strategies, user
    });

    return company
  }

};
