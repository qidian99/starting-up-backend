module.exports = {

  definition: `
  `,
  query: `
  `,
  mutation: `
  registerCompany(name: String! strategies: JSON!): Company
  `,
  subscription: `
  `,
  resolver: {
    Query: {
    },
    Mutation: {
      registerCompany: {
        policies: [],
        resolver: 'application::company.company.createCompany',
      }
    },
    Subscription: {
    }
  },
};
