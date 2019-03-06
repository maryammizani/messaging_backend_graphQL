// Import buildSchema function which allows building a schema object
const { buildSchema } = require('graphql');

// buildSchema function creates an object that can be parsed by graphQL express
module.exports = buildSchema(`
    type TestData {
        text: String!
        views: Int!
    }

    type RootQuery {
        hello: TestData! 
    }
    schema {
        query: RootQuery
    }
`)
