import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs with different user roles
const customerInput: CreateUserInput = {
  email: 'customer@test.com',
  name: 'John Customer',
  phone: '+1234567890',
  role: 'customer'
};

const staffInput: CreateUserInput = {
  email: 'staff@test.com',
  name: 'Jane Staff',
  phone: '+0987654321',
  role: 'staff'
};

const adminInput: CreateUserInput = {
  email: 'admin@test.com',
  name: 'Admin User',
  phone: null,
  role: 'admin'
};

// Test input with minimal fields (relying on defaults)
const minimalInput: CreateUserInput = {
  email: 'minimal@test.com',
  name: 'Minimal User',
  phone: null,
  role: 'customer' // Include all fields to match Zod schema
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer user', async () => {
    const result = await createUser(customerInput);

    // Basic field validation
    expect(result.email).toEqual('customer@test.com');
    expect(result.name).toEqual('John Customer');
    expect(result.phone).toEqual('+1234567890');
    expect(result.role).toEqual('customer');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a staff user', async () => {
    const result = await createUser(staffInput);

    expect(result.email).toEqual('staff@test.com');
    expect(result.name).toEqual('Jane Staff');
    expect(result.phone).toEqual('+0987654321');
    expect(result.role).toEqual('staff');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    expect(result.email).toEqual('admin@test.com');
    expect(result.name).toEqual('Admin User');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal fields', async () => {
    const result = await createUser(minimalInput);

    expect(result.email).toEqual('minimal@test.com');
    expect(result.name).toEqual('Minimal User');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('customer');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(customerInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('customer@test.com');
    expect(users[0].name).toEqual('John Customer');
    expect(users[0].phone).toEqual('+1234567890');
    expect(users[0].role).toEqual('customer');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(customerInput);

    // Try to create another user with the same email
    const duplicateInput: CreateUserInput = {
      email: 'customer@test.com', // Same email
      name: 'Different Name',
      phone: '+1111111111',
      role: 'staff'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(customerInput);
    const user2 = await createUser(staffInput);
    const user3 = await createUser(adminInput);

    // Verify all users were created with different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user2.id).not.toEqual(user3.id);
    expect(user1.id).not.toEqual(user3.id);

    // Verify all users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);

    // Verify emails are unique
    const emails = allUsers.map(user => user.email);
    expect(emails).toContain('customer@test.com');
    expect(emails).toContain('staff@test.com');
    expect(emails).toContain('admin@test.com');
  });

  it('should handle null phone numbers correctly', async () => {
    const result = await createUser(adminInput);

    expect(result.phone).toBeNull();

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].phone).toBeNull();
  });

  it('should validate user role enum values', async () => {
    const validRoles = ['customer', 'staff', 'admin'] as const;
    
    for (const role of validRoles) {
      const testInput: CreateUserInput = {
        email: `${role}@role-test.com`,
        name: `${role} User`,
        phone: null,
        role: role
      };

      const result = await createUser(testInput);
      expect(result.role).toEqual(role);
    }

    // Verify all role users were created
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
    
    const roles = allUsers.map(user => user.role).sort();
    expect(roles).toEqual(['admin', 'customer', 'staff']);
  });
});