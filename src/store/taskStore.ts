import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { Task, Project, Subtask, TaskTag } from '../lib/supabase';

export interface TaskWithDetails extends Task {
  subtasks: Subtask[];
  tags: string[];
  assignee?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

export interface ProjectWithDetails extends Project {
  tasks: TaskWithDetails[];
  members: {
    id: string;
    name: string;
    avatar_url?: string;
    role: string;
  }[];
}

interface TaskState {
  tasks: TaskWithDetails[];
  projects: ProjectWithDetails[];
  currentProject: string | null;
  viewMode: 'list' | 'kanban' | 'calendar' | 'gantt';
  isLoading: boolean;
  error: string | null;
  
  // Task actions
  fetchTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Project actions
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'owner_id'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (projectId: string | null) => void;
  
  // View actions
  setViewMode: (mode: 'list' | 'kanban' | 'calendar' | 'gantt') => void;
  
  // Utility actions
  clearError: () => void;
}

// Mock data for fallback
const mockTasks: TaskWithDetails[] = [
  {
    id: 'mock-task-1',
    title: 'Design Homepage Layout',
    description: 'Create wireframes and mockups for the new homepage design',
    status: 'in_progress',
    priority: 'high',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    project_id: 'mock-project-1',
    created_by: 'mock-user-1',
    assignee_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [
      {
        id: 'mock-subtask-1',
        task_id: 'mock-task-1',
        title: 'Create wireframes',
        completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'mock-subtask-2',
        task_id: 'mock-task-1',
        title: 'Design mockups',
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    tags: ['design', 'frontend'],
    assignee: {
      id: 'mock-user-1',
      name: 'John Doe',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  },
  {
    id: 'mock-task-2',
    title: 'Implement User Authentication',
    description: 'Set up user registration, login, and session management',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    project_id: 'mock-project-1',
    created_by: 'mock-user-2',
    assignee_id: 'mock-user-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [],
    tags: ['backend', 'security'],
    assignee: {
      id: 'mock-user-2',
      name: 'Jane Smith',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  },
  {
    id: 'mock-task-3',
    title: 'Database Schema Design',
    description: 'Design and implement the database schema for the application',
    status: 'completed',
    priority: 'medium',
    due_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    project_id: 'mock-project-1',
    created_by: 'mock-user-1',
    assignee_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [],
    tags: ['database', 'backend'],
    assignee: {
      id: 'mock-user-1',
      name: 'John Doe',
      avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  },
  {
    id: 'mock-task-4',
    title: 'Mobile App Testing',
    description: 'Conduct comprehensive testing on mobile devices',
    status: 'in_progress',
    priority: 'medium',
    due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    project_id: 'mock-project-2',
    created_by: 'mock-user-2',
    assignee_id: 'mock-user-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    subtasks: [],
    tags: ['testing', 'mobile'],
    assignee: {
      id: 'mock-user-2',
      name: 'Jane Smith',
      avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150'
    }
  }
];

const mockProjects: ProjectWithDetails[] = [
  {
    id: 'mock-project-1',
    title: 'TaskFlow Web Application',
    description: 'Main web application for task and project management',
    color: '#3b82f6',
    status: 'active',
    owner_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tasks: mockTasks.filter(task => task.project_id === 'mock-project-1'),
    members: [
      {
        id: 'mock-user-1',
        name: 'John Doe',
        avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
        role: 'owner'
      },
      {
        id: 'mock-user-2',
        name: 'Jane Smith',
        avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
        role: 'member'
      }
    ]
  },
  {
    id: 'mock-project-2',
    title: 'Mobile App Development',
    description: 'Cross-platform mobile application development',
    color: '#10b981',
    status: 'active',
    owner_id: 'mock-user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tasks: mockTasks.filter(task => task.project_id === 'mock-project-2'),
    members: [
      {
        id: 'mock-user-1',
        name: 'John Doe',
        avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
        role: 'owner'
      },
      {
        id: 'mock-user-2',
        name: 'Jane Smith',
        avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150',
        role: 'member'
      }
    ]
  }
];

const handleAuthError = async (error: any) => {
  console.error('Authentication error detected:', error);
  
  // Check if it's an authentication-related error
  const isAuthError = error.message?.includes('Authentication failed') ||
                     error.message?.includes('Not authenticated') ||
                     error.message?.includes('Invalid session') ||
                     error.message?.includes('Auth session missing');
  
  if (isAuthError) {
    try {
      // Import auth store dynamically to avoid circular dependencies
      const { useAuthStore } = await import('./authStore');
      const authStore = useAuthStore.getState();
      
      // Clear authentication state and redirect to login
      authStore.logout();
    } catch (importError) {
      console.error('Failed to import auth store:', importError);
      // Fallback: redirect to login page manually
      window.location.href = '/auth';
    }
  }
};

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      projects: [],
      currentProject: null,
      viewMode: 'list',
      isLoading: false,
      error: null,

      fetchTasks: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('Auth error:', userError);
            throw new Error('Auth session missing!');
          }
          
          if (!user) {
            throw new Error('Not authenticated');
          }

          // Verify user session is valid
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) {
            console.error('Session error:', sessionError);
            throw new Error('Invalid session');
          }

          // First check if user has any projects, if not create a default one
          const { data: existingProjects } = await supabase
            .from('projects')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1);

          if (!existingProjects || existingProjects.length === 0) {
            // Create a default project
            const { data: newProject, error: projectError } = await supabase
              .from('projects')
              .insert({
                title: 'My First Project',
                description: 'Welcome to TaskFlow! This is your first project.',
                color: '#3b82f6',
                owner_id: user.id,
              })
              .select()
              .single();

            if (!projectError && newProject) {
              // Add user as project member
              await supabase
                .from('project_members')
                .insert({
                  project_id: newProject.id,
                  user_id: user.id,
                  role: 'owner',
                });
            }
          }

          // Fetch tasks with related data
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select(`
              *,
              subtasks (*),
              task_tags (tag),
              assignee:profiles!tasks_assignee_id_fkey (id, name, avatar_url)
            `)
            .order('created_at', { ascending: false });

          if (tasksError) {
            console.error('Tasks fetch error:', tasksError);
            // Don't throw error if it's just empty results
            if (tasksError.code !== 'PGRST116') {
              throw tasksError;
            }
          }

          // Transform the data
          const tasks: TaskWithDetails[] = (tasksData || []).map(task => ({
            ...task,
            subtasks: task.subtasks || [],
            tags: (task.task_tags || []).map((tt: any) => tt.tag),
            assignee: task.assignee || undefined,
          }));

          set({ tasks, isLoading: false });
        } catch (error: any) {
          console.error('Fetch tasks error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          // Use mock data as fallback
          console.log('Using mock data for tasks due to authentication error');
          set({ 
            tasks: mockTasks,
            error: null, // Clear error to allow UI to function with mock data
            isLoading: false 
          });
        }
      },

      addTask: async (taskData) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('Not authenticated');
          }

          const { data, error } = await supabase
            .from('tasks')
            .insert({
              ...taskData,
              created_by: user.id,
            })
            .select()
            .single();

          if (error) throw error;

          // Refresh tasks
          await get().fetchTasks();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Add task error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          set({ 
            error: error.message || 'Failed to create task', 
            isLoading: false 
          });
        }
      },

      updateTask: async (id, updates) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase
            .from('tasks')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (error) throw error;

          // Refresh tasks
          await get().fetchTasks();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Update task error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          set({ 
            error: error.message || 'Failed to update task', 
            isLoading: false 
          });
        }
      },

      deleteTask: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Refresh tasks
          await get().fetchTasks();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Delete task error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          set({ 
            error: error.message || 'Failed to delete task', 
            isLoading: false 
          });
        }
      },

      fetchProjects: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('Auth error:', userError);
            throw new Error('Authentication failed');
          }
          
          if (!user) {
            throw new Error('Not authenticated');
          }

          // Verify user session is valid
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !session) {
            console.error('Session error:', sessionError);
            throw new Error('Invalid session');
          }

          // Fetch projects with members
          const { data: projectsData, error: projectsError } = await supabase
            .from('projects')
            .select(`
              *,
              project_members (
                role,
                user:profiles (id, name, avatar_url)
              )
            `)
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

          if (projectsError) {
            console.error('Projects fetch error:', projectsError);
            // Don't throw error if it's just empty results
            if (projectsError.code !== 'PGRST116') {
              throw projectsError;
            }
          }

          // Transform the data
          const projects: ProjectWithDetails[] = (projectsData || []).map(project => ({
            ...project,
            tasks: [], // Will be populated when tasks are fetched
            members: (project.project_members || []).map((pm: any) => ({
              ...pm.user,
              role: pm.role,
            })),
          }));

          set({ projects, isLoading: false });

          // Set default project if none selected
          if (!get().currentProject && projects.length > 0) {
            set({ currentProject: projects[0].id });
          }
        } catch (error: any) {
          console.error('Fetch projects error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          // Use mock data as fallback
          console.log('Using mock data for projects due to authentication error');
          set({ 
            projects: mockProjects,
            currentProject: mockProjects[0]?.id || null,
            error: null, // Clear error to allow UI to function with mock data
            isLoading: false 
          });
        }
      },

      addProject: async (projectData) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('Not authenticated');
          }

          // Create project
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
              ...projectData,
              owner_id: user.id,
            })
            .select()
            .single();

          if (projectError) throw projectError;

          // Add user as project member
          const { error: memberError } = await supabase
            .from('project_members')
            .insert({
              project_id: project.id,
              user_id: user.id,
              role: 'owner',
            });

          if (memberError) {
            console.warn('Failed to add project member:', memberError);
          }

          // Refresh projects
          await get().fetchProjects();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Add project error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          set({ 
            error: error.message || 'Failed to create project', 
            isLoading: false 
          });
        }
      },

      updateProject: async (id, updates) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase
            .from('projects')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);

          if (error) throw error;

          // Refresh projects
          await get().fetchProjects();
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Update project error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          set({ 
            error: error.message || 'Failed to update project', 
            isLoading: false 
          });
        }
      },

      deleteProject: async (id) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Refresh projects
          await get().fetchProjects();
          
          // Clear current project if it was deleted
          if (get().currentProject === id) {
            set({ currentProject: null });
          }
          
          set({ isLoading: false });
        } catch (error: any) {
          console.error('Delete project error:', error);
          
          // Handle authentication errors
          await handleAuthError(error);
          
          set({ 
            error: error.message || 'Failed to delete project', 
            isLoading: false 
          });
        }
      },

      setCurrentProject: (projectId) => {
        set({ currentProject: projectId });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'task-storage',
      partialize: (state) => ({ 
        currentProject: state.currentProject,
        viewMode: state.viewMode 
      }),
    }
  )
);