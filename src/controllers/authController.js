import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role, businessName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'WHOLESALER') {
      if (!businessName)
        return res.status(400).json({ error: 'Business name is required for Wholesalers' });

      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'WHOLESALER',
          wholesalerProfile: {
            create: { businessName },
          },
        },
        include: { wholesalerProfile: true },
      });
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'CUSTOMER',
        },
      });
    }

    res.status(201).json({ message: 'Registration successful. Please log in.' });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { wholesalerProfile: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const payload = {
      userId: user.id,
      role: user.role,
      ...(user.role === 'WHOLESALER' && user.wholesalerProfile
        ? { wholesalerId: user.wholesalerProfile.id }
        : {}),
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
        businessName: user.wholesalerProfile?.businessName || null,
      },
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};
