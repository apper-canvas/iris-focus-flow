import tasksData from "@/services/mockData/tasks.json";

// Initialize ApperSDK for Edge function calls
let ApperClient = null;
if (typeof window !== 'undefined' && window.ApperSDK) {
  ApperClient = new window.ApperSDK.ApperClient({
    apperProjectId: import.meta.env.VITE_APPER_PROJECT_ID,
    apperPublicKey: import.meta.env.VITE_APPER_PUBLIC_KEY
  });
}

let tasks = [...tasksData];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const taskService = {
  async getAll() {
    await delay(300);
    return [...tasks].sort((a, b) => a.order - b.order);
  },

  async getById(id) {
    await delay(200);
    const task = tasks.find(task => task.Id === parseInt(id));
    return task ? { ...task } : null;
  },

  async create(taskData) {
    await delay(400);
    const maxId = Math.max(...tasks.map(task => task.Id), 0);
    const maxOrder = Math.max(...tasks.map(task => task.order), 0);
const newTask = {
      Id: maxId + 1,
      title: taskData.title,
      description: taskData.description || "",
      priority: taskData.priority || "medium",
      completed: false,
      assignee: taskData.assignee || "",
      projectId: taskData.projectId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: maxOrder + 1
    };
    tasks.push(newTask);
    return { ...newTask };
  },

async update(id, updates) {
    await delay(250);
    const index = tasks.findIndex(task => task.Id === parseInt(id));
    if (index !== -1) {
      const previousTask = { ...tasks[index] };
      tasks[index] = {
        ...tasks[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Send email notification if task was just completed
      if (updates.completed === true && !previousTask.completed && ApperClient) {
        try {
          const result = await ApperClient.functions.invoke(import.meta.env.VITE_SEND_TASK_COMPLETION_EMAIL, {
            body: JSON.stringify({
              taskTitle: tasks[index].title,
              taskDescription: tasks[index].description,
              assignee: tasks[index].assignee,
              priority: tasks[index].priority,
              recipientEmail: tasks[index].assignee ? `${tasks[index].assignee.toLowerCase().replace(' ', '.')}@company.com` : 'admin@company.com'
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const responseData = await result.json();
          if (!responseData.success) {
            console.info(`apper_info: An error was received in this function: ${import.meta.env.VITE_SEND_TASK_COMPLETION_EMAIL}. The response body is: ${JSON.stringify(responseData)}.`);
          }
        } catch (error) {
          console.info(`apper_info: An error was received in this function: ${import.meta.env.VITE_SEND_TASK_COMPLETION_EMAIL}. The error is: ${error.message}`);
        }
      }
      
      return { ...tasks[index] };
    }
    return null;
  },

  async delete(id) {
    await delay(200);
    const index = tasks.findIndex(task => task.Id === parseInt(id));
    if (index !== -1) {
      const deletedTask = tasks.splice(index, 1)[0];
      return { ...deletedTask };
    }
    return null;
  },

  async updateOrder(taskIds) {
    await delay(150);
    taskIds.forEach((id, index) => {
      const task = tasks.find(task => task.Id === parseInt(id));
      if (task) {
        task.order = index + 1;
        task.updatedAt = new Date().toISOString();
      }
    });
    return true;
  },

  async getStats() {
    await delay(100);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const activeTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      total: totalTasks,
      completed: completedTasks,
      active: activeTasks,
      completionRate
    };
  }
};