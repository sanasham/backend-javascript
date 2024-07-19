import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import generateAccessAndRefreshToken from "../utils/tokens.js";
import jwt from "jsonwebtoken";
import { response } from "express";
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  //validation - not empty
  // check if the user already exists: userName and email
  //check for images, check for avatar
  // upload them to cloudinary,  check avatar

  // create user object-
  // create entry into db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { fullName, email, userName, password } = req.body;
  // if(fullName === "") {
  //   throw new ApiError(400, "fullname is required");
  // }
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "userName or email already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  console.log("avatar response received", avatar);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(400, "Something went wrong while registering a user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get the username or email from body
  //find the user
  // check password
  // generate access token and refresh token
  // send cookie
  const { userName, email, password } = req.body;
  if (!userName && !email) {
    throw new ApiError(400, "username or email is required");
  }
  const userExists = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!userExists) {
    throw new ApiError(404, "user does not exist");
  }
  const isPasswordValied = await userExists.isPasswordCorrect(password);

  if (!isPasswordValied) {
    throw new ApiError(401, "Invalied user credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    userExists._id
  );
  userExists.accessToken = accessToken;
  userExists.refreshToken = refreshToken;

  const options = {
    httpOnly: true,
    secure: true,
  };
  // Sanitize user object
  const sanitizedUser = { ...userExists._doc };
  delete sanitizedUser.password;
  delete sanitizedUser.refreshToken;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        {
          user: sanitizedUser,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken")
    .clearCookie("refreshToken")
    .json(new ApiResponse(200, {}, "User Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "AccessToken Refreshed successfully"
        )
      );
  } catch (err) {
    throw new ApiError(401, err.message || "Invalid access token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      throw new ApiError(
        400,
        "Did not match new password and confirm password"
      );
    }
    const user = await User.findById(req?.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (err) {
    throw new ApiError(
      500,
      err.message || "There was an error while changing your password"
    );
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    return req
      .status(200)
      .json(
        new ApiResponse(200, req.user, "current user fetched successfully")
      );
  } catch (err) {
    throw new ApiError(
      500,
      err.message || "There was an error while fetching current user"
    );
  }
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName && !email) {
    throw new ApiError(400, "All fields are mandatory");
  }

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  return req
    .status(200)
    .json(new ApiResponse(200, user, "user details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
      throw new ApiError(400, "avatar file is missing");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
      throw new ApiError(400, "Error while uploading avatar file");
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password");
    return req
      .status(200)
      .json(new ApiResponse(200, user, "Avatar Image updated successfully"));
  } catch (err) {
    throw new ApiError(
      500,
      err.message || "There was an error while updating avatar file"
    );
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover Image file is missing");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
      throw new ApiError(400, "Error while uploading cover Image file");
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      { new: true }
    ).select("-password");
    return req
      .status(200)
      .json(new ApiResponse(200, user, "Cover Image updated successfully"));
  } catch (err) {
    throw new ApiError(
      500,
      err.message || "There was an error while updating cover Image file"
    );
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
