import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async ()=>{
    try {
        const connectionData = await mongoose.connect(`${process.env.MONGO}/${DB_NAME}`)
        // console.log(`MongoDB connected with host: ${connectionData.connection.host}`)
        return connectionData.connection.host
    } catch (error) {
        // console.log('MongoDB connection error', error)
        throw error
        process.exit(1)
    }
}
export default connectDB;