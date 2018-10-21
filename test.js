var promisesAplusTests = require("promises-aplus-tests")
var adapter = require('./adapter')

promisesAplusTests(adapter, function(err) {
  console.log(err)
})
