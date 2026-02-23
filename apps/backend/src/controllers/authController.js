// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { prisma } from '../config/db.js';

// // --- REGISTER ---
// export const register = async (req, res) => {
//   try {
//     const { email, password, role, businessName, wholesalerId } = req.body;

//     // 1. Check if user already exists
//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) {
//       return res.status(400).json({ error: 'Email is already registered' });
//     }

//     // 2. Hash the password securely
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 3. Prepare the Prisma query using Nested Writes for transactions
//     let userData = {
//       email,
//       password: hashedPassword,
//       role: role || 'CUSTOMER',
//     };

//     // If they are registering as a WHOLESALER, create their tenant profile
//     if (role === 'WHOLESALER') {
//       if (!businessName) return res.status(400).json({ error: 'businessName is required for wholesalers' });
//       userData.wholesalerProfile = {
//         create: { businessName }
//       };
//     }

//     // If they are registering as a B2C CUSTOMER, link them to a specific Wholesaler
//     if (role === 'CUSTOMER') {
//       if (!wholesalerId) return res.status(400).json({ error: 'wholesalerId is required for customers' });
//       userData.customerProfile = {
//         create: { wholesalerId }
//       };
//     }

//     // 4. Save to database
//     const user = await prisma.user.create({
//       data: userData,
//       include: {
//         wholesalerProfile: true,
//         customerProfile: true,
//       }
//     });

//     res.status(201).json({ message: 'User registered successfully', userId: user.id });
//   } catch (error) {
//     console.error('Registration Error:', error);
//     res.status(500).json({ error: 'Internal server error during registration' });
//   }
// };

// // --- LOGIN ---
// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 1. Find user and include their profiles
//     const user = await prisma.user.findUnique({
//       where: { email },
//       include: { wholesalerProfile: true, customerProfile: true }
//     });

//     if (!user) return res.status(400).json({ error: 'Invalid credentials' });

//     // 2. Verify password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

//     // 3. Determine Tenant ID (wholesalerId) for the JWT Payload
//     let tenantId = null;
//     if (user.role === 'WHOLESALER') tenantId = user.wholesalerProfile?.id;
//     if (user.role === 'CUSTOMER') tenantId = user.customerProfile?.wholesalerId;

//     // 4. Generate JWT Token
//     const payload = {
//       userId: user.id,
//       role: user.role,
//       wholesalerId: tenantId // Injects the multi-tenant context!
//     };

//     const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

//     res.status(200).json({
//       message: 'Login successful',
//       token,
//       user: {
//         id: user.id,
//         email: user.email,
//         role: user.role,
//         wholesalerId: tenantId
//       }
//     });
//   } catch (error) {
//     console.error('Login Error:', error);
//     res.status(500).json({ error: 'Internal server error during login' });
//   }
// };
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

// --- GLOBAL REGISTRATION ---
export const register = async (req, res) => {
  try {
    const { name, email, password, role, businessName } = req.body;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the User (and Wholesaler profile if needed)
    let newUser;
    if (role === 'WHOLESALER') {
      if (!businessName) return res.status(400).json({ error: 'Business name is required for Wholesalers' });
      
      // Create User and Wholesaler profile together in one transaction
      newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'WHOLESALER',
          wholesalerProfile: {
            create: { businessName }
          }
        },
        include: { wholesalerProfile: true }
      });
    } else {
      // Standard Customer Registration
      newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'CUSTOMER'
        }
      });
    }

    res.status(201).json({ message: 'Registration successful. Please log in.' });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// --- GLOBAL LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the User and include their Wholesaler profile (if they have one)
    const user = await prisma.user.findUnique({
      where: { email },
      include: { wholesalerProfile: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Build the JWT Payload
    // This is the magic key that tells the rest of the app who they are
    const payload = {
      userId: user.id,
      role: user.role,
      // If they are a wholesaler, attach their shop ID!
      ...(user.role === 'WHOLESALER' && user.wholesalerProfile ? { wholesalerId: user.wholesalerProfile.id } : {})
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.wholesalerProfile?.businessName || null
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: 'Login failed' });
  }
};