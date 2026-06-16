import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { normalizeEmail, validateRegistrationPayload } from '../utils/authValidation.js';

const isUniqueEmailConstraintError = (error) => error?.code === 'P2002';

export const register = async (req, res) => {
  try {
    const validation = validateRegistrationPayload(req.body || {});
    if (validation.error) {
      return res.status(400).json({ error: validation.error });
    }

    const { name, email, password, role, businessName } = validation.value;

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'WHOLESALER') {
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
    if (isUniqueEmailConstraintError(error)) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    console.error('REGISTER ERROR:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

export const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};

    if (!email || !password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
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
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};
