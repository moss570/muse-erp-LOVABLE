import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  role: 'employee' | 'supervisor' | 'manager' | 'admin';
  sendPasswordResetEmail?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token to verify permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the requesting user using getClaims (works with signing-keys)
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    // Check if user has admin or manager role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId);

    if (roleError) {
      throw new Error('Failed to verify user permissions');
    }

    const hasPermission = userRoles?.some(
      (r) => r.role === 'admin' || r.role === 'manager'
    );

    if (!hasPermission) {
      throw new Error('Insufficient permissions. Only admins and managers can create user accounts.');
    }

    // Parse request body
    const requestBody: CreateUserRequest = await req.json();
    const { email, password, firstName, lastName, employeeId, role, sendPasswordResetEmail } =
      requestBody;

    // Validate required fields
    if (!email || !password || !employeeId || !role) {
      throw new Error('Missing required fields: email, password, employeeId, and role are required');
    }

    // Create admin client for user creation
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('User creation failed');
    }

    // Link the employee to the new profile
    const { error: linkError } = await supabaseAdmin
      .from('employees')
      .update({ profile_id: newUser.user.id })
      .eq('id', employeeId);

    if (linkError) {
      console.error('Failed to link employee to profile:', linkError);
      // Don't throw - user was created successfully, we just couldn't link it
      // The admin can manually link it later if needed
    }

    // Assign the specified role
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role,
        assigned_by: requestingUserId,
      });

    if (roleAssignError) {
      console.error('Failed to assign role:', roleAssignError);
      // Don't throw - user was created, role can be assigned later
    }

    // Record initial invitation
    const { error: inviteRecordError } = await supabaseAdmin
      .from('employee_account_invitations')
      .insert({
        employee_id: employeeId,
        user_id: newUser.user.id,
        email: email,
        invited_by: requestingUserId,
        invitation_type: 'initial',
        email_sent: sendPasswordResetEmail || false,
      });

    if (inviteRecordError) {
      console.error('Failed to record invitation:', inviteRecordError);
    }

    // Send password reset email if requested
    if (sendPasswordResetEmail) {
      const { error: resetError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      if (resetError) {
        console.error('Failed to send password reset email:', resetError);
        // Don't throw - user was created successfully
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        message: 'User account created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error creating employee user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
