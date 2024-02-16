class ApiResponse{
    constructor(
        statusCode,
        message = 'Success', //Can override but till then have success as default
        data,
    ) {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400  //will evaluate following the general spec sheet
    }
}

export {ApiResponse}