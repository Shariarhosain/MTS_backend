const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Socket } = require('socket.io-client');

// Create an instance of express app
const app = express();
const server = http.createServer(app); // assuming you are using express
const io = socketIo(server);  // Create a new instance of Socket.IO


exports.selesView_recent_month = async (req, res) => {
    try {
        const currentDate = new Date();
        console.log('Current Date:', currentDate);
        
        // Current month (April)
        const startOfCurrentMonth = new Date(currentDate.getFullYear(), 3, 1); // Month 3 = April, 1st day
        startOfCurrentMonth.setHours(0, 0, 0, 0);  // Set time to midnight (00:00:00) in local time
        
        const endOfCurrentMonth = new Date(currentDate.getFullYear(), 4, 0); // Last day of April
        endOfCurrentMonth.setHours(23, 59, 59, 999);  // Set time to the end of the day (23:59:59.999) in local time
    
        // Previous month (March)
        const startOfLastMonth = new Date(currentDate.getFullYear(), 2, 1); // Month 2 = March, 1st day
        startOfLastMonth.setHours(0, 0, 0, 0); // Set time to midnight (00:00:00) in local time
        
        const endOfLastMonth = new Date(currentDate.getFullYear(), 3, 0); // Last day of March
        endOfLastMonth.setHours(23, 59, 59, 999); // Set time to the end of the day (23:59:59.999) in local time
     
        const startDate = startOfCurrentMonth;
        const endDate = endOfCurrentMonth;

        const salesData = await prisma.project.groupBy({
            by: ['profile_id'],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                after_fiverr_amount: true,
                after_Fiverr_bonus: true
            }
        });
       
        

        const salesDataWithProfileName = await Promise.all(salesData.map(async (data) => {
            if (data.profile_id) {  // Only proceed if profile_id is not null
                const profile = await prisma.profile.findUnique({
                    where: { id: data.profile_id },  // Query only if profile_id is valid
                    select: { profile_name: true }
                });
                return {
                    profile_name: profile?.profile_name || 'Unknown',
                    total_sales: Number(data._sum.after_fiverr_amount || 0) + Number(data._sum.after_Fiverr_bonus || 0),
                };
                
            } else {
                // If profile_id is null, return a default profile_name
                return {
                    profile_name: 'Unknown',  // Fallback value when no profile_id is provided
                    total_sales: data._sum.after_fiverr_amount + data._sum.after_Fiverr_bonus
                };
            }
        }));
        
        console.log(salesDataWithProfileName);
        // Emit the sales data to all connected clients
        return res.status(200).json({
            message: 'Sales data retrieved successfully',
            salesData: salesDataWithProfileName
        });
    } catch (error) {
        console.error('Error retrieving sales data:', error);
        return res.status(500).json({ message: 'An error occurred while retrieving sales data', error: error.message });
    }
};


