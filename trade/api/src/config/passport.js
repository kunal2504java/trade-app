import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

passport.use(new GoogleStrategy({
    // The '!' non-null assertion is removed
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email']
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Find if the user already exists
        let user = await prisma.user.findUnique({
            where: { googleId: profile.id }
        });

        if (user) {
            return done(null, user); // User found, log them in
        }

        // If not, check if they exist by email
        user = await prisma.user.findUnique({ where: { email: profile.emails[0].value } });
        
        if (user) {
            // User exists but hasn't linked Google. Link it now.
            user = await prisma.user.update({
                where: { email: profile.emails[0].value },
                data: { googleId: profile.id }
            });
            return done(null, user);
        }

        // If user doesn't exist at all, create a new one
        const newUser = await prisma.user.create({
            data: {
                googleId: profile.id,
                full_name: profile.displayName,
                email: profile.emails[0].value,
                referral_code: nanoid(10), // Generate a random referral code
                // sponsor_id and position are null for Google sign-ups
                wallet: {
                    create: { balance: 0 }
                }
            }
        });
        return done(null, newUser);

    } catch (error) {
        return done(error, false);
    }
}));

// Type annotations `: any` and `: string` are removed from the function parameters
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
});
