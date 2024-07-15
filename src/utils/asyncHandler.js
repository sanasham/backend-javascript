const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };

// asyncHandler is one hiegher order function

// const asynchand = () =>{
//    async () =>{}                             // here we can write one function inside another function
// }

// we can modify above function like below

//const asynchand = () => async () => {}; // just removing return curly braceses

// const asyncHandler = (fn) => async (req, res, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (err) {
//     res.status(err.code || 500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
