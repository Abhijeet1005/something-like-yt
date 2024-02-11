const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

export { asyncHandler };

/*

Some things about the above syntax from GPT 

1. const asyncHandler = (requestHandler) => { ... }: This defines an arrow function called asyncHandler that takes a requestHandler function as a parameter.

2. return (req, res, next) => { ... }: The arrow function returned by asyncHandler takes three parameters: req (request), res (response), and next (next middleware function). This function will be used as middleware in an Express route.

3. Promise.resolve(requestHandler(req, res, next)): This part creates a promise by using Promise.resolve(). It calls the requestHandler function with the provided req, res, and next parameters. If requestHandler returns a promise, it will be resolved. If it returns a non-promise value, it will be wrapped in a resolved promise.

4. .catch((err) => { next(err); }): The catch method is chained to the promise. If there is any error during the execution of the requestHandler, the error is caught, and next(err) is called. This passes the error to the next middleware or error-handling route in the Express application.

*/
