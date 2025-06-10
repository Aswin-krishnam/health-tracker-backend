const nodemailer = require('nodemailer');

// Create a transporter using SMTP with the working configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "neuralearnhelp@gmail.com",
        pass: "fgoe ccrb gpqe uvcf"
    }
});

// Send weekly health report
const sendWeeklyReport = async (userEmail, reportData) => {
    try {
        const { exercise, sleep, hydration, nutrition } = reportData;

        const emailContent = `
            <h2>Your Weekly Health Report</h2>
            <p>Here's a summary of your health tracking for the past week:</p>

            <h3>Exercise Summary</h3>
            <ul>
                <li>Total Workouts: ${exercise.totalWorkouts}</li>
                <li>Total Minutes: ${exercise.totalMinutes}</li>
                <li>Calories Burned: ${exercise.totalCalories}</li>
            </ul>

            <h3>Sleep Analysis</h3>
            <ul>
                <li>Average Duration: ${Math.round(sleep.averageDuration * 10) / 10} hours</li>
                <li>Days Tracked: ${sleep.daysLogged}</li>
            </ul>

            <h3>Hydration</h3>
            <ul>
                <li>Average Daily Intake: ${Math.round(hydration.averageIntake / 100) / 10}L</li>
                <li>Target Achievement: ${hydration.targetAchievedDays} days</li>
            </ul>

            <h3>Nutrition Overview</h3>
            <ul>
                <li>Average Daily Calories: ${Math.round(nutrition.averageCalories)} kcal</li>
                <li>Total Meals Tracked: ${nutrition.totalMeals}</li>
            </ul>

            <p>Keep up the good work! Regular tracking helps you maintain a healthy lifestyle.</p>
        `;

        const mailOptions = {
            from: '"Health Tracker" <neuralearnhelp@gmail.com>',
            to: userEmail,
            subject: 'Your Weekly Health Report',
            html: emailContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Weekly report sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending weekly report:', error);
        throw error;
    }
};

// Send reminder for tracking
const sendTrackingReminder = async (userEmail, untracked) => {
    try {
        const emailContent = `
            <h2>Daily Tracking Reminder</h2>
            <p>Hey there! We noticed you haven't tracked the following today:</p>
            <ul>
                ${untracked.map(item => `<li>${item}</li>`).join('')}
            </ul>
            <p>Consistent tracking helps you achieve your health goals. Take a moment to log your activities!</p>
            <a href="${process.env.FRONTEND_URL}/tracking/daily" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Track Now</a>
        `;

        const mailOptions = {
            from: '"Health Tracker" <neuralearnhelp@gmail.com>',
            to: userEmail,
            subject: 'Reminder: Track Your Daily Health Activities',
            html: emailContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Tracking reminder sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending tracking reminder:', error);
        throw error;
    }
};

// Send milestone achievement notification
const sendMilestoneNotification = async (userEmail, milestone) => {
    try {
        const emailContent = `
            <h2>Congratulations! 🎉</h2>
            <p>You've achieved a new milestone in your health journey:</p>
            <div style="padding: 20px; background-color: #f8f9fa; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #28a745">${milestone.title}</h3>
                <p>${milestone.description}</p>
            </div>
            <p>Keep pushing forward! Every achievement brings you closer to your health goals.</p>
        `;

        const mailOptions = {
            from: '"Health Tracker" <neuralearnhelp@gmail.com>',
            to: userEmail,
            subject: '🏆 New Health Milestone Achieved!',
            html: emailContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Milestone notification sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending milestone notification:', error);
        throw error;
    }
};

module.exports = {
    sendWeeklyReport,
    sendTrackingReminder,
    sendMilestoneNotification
};
