import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { verifyPassword } from '@/lib/auth';
import { LoginRequest } from '@/types';
import { cookies } from 'next/headers';

// In dev we authenticate against the local Express API (which talks to the
// local Postgres seed), so the localhost sandbox uses the same demo accounts
// as `pnpm dlx tsx apps/api/scripts/seed.ts`. Production keeps using Supabase.
const IS_DEV = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (IS_DEV) {
      const res = await fetch('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: body.email, password: body.password }),
        cache: 'no-store',
      });
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        );
      }
      const data = await res.json();
      const u = data.user;
      const cookieStore = await cookies();
      cookieStore.set('skillbridge_session', JSON.stringify({
        userId: u.id,
        email: u.email,
        role: u.role,
      }), {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });
      return NextResponse.json(
        { success: true, user: { id: u.id, email: u.email, full_name: u.full_name, role: u.role, is_verified: u.is_verified, is_email_verified: u.is_email_verified } },
        { status: 200 }
      );
    }

    // Find user by email
    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', body.email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await verifyPassword(body.password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'user_login',
      resource_type: 'user',
      resource_id: user.id,
    });

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('skillbridge_session', JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          is_verified: user.is_verified,
          is_email_verified: user.is_email_verified,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
