
const asyncHandler = (requestHandler) =>{
  return (req,res,next)=>{

    Promise.resolve(requestHandler(req,res,next))
    .catch((err)=>next(err))
  } 

}

export {asyncHandler}


/*
const asyncHandler = (fn) => { 
  return () => { 
    // implementation here 
  };
};
Higher-Order Function: asyncHandler is a higher-order function because it takes a function fn as an argument and returns a new function.
 
const asyncHandler = (fn) => async(req,res,next)=>{
  try {
    await fn(req,res,next)
    
  } catch (error) {
    res.status(err.code||500).json({
      success:false,
      message:err.message
    })
    
  }
}
*/