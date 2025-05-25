
export const initialTasks = [
  {
    id: 'task1',
    title: 'Introduction to Linux Commands',
    description: 'Learn basic navigation and file manipulation commands.',
    details: 'Objective: Navigate to the /home/student/documents directory and list its contents. Then, create a new file named "notes.txt" in this directory.',
    completed: false,
    terminalSetup: {
      initialDirectory: '/home/student',
      message: 'Welcome to the Linux basics lab! Your current directory is /home/student. Good luck!',
    },
    validationCommand: 'ls /home/student/documents | grep notes.txt',
    successMessage: 'Great job! You have successfully created notes.txt in the documents directory.',
  },
  {
    id: 'task2',
    title: 'File Permissions',
    description: 'Understand and modify file permissions.',
    details: 'Objective: In the /home/student/documents directory, change the permissions of "notes.txt" to be read-only for the owner and no permissions for group and others (chmod 400 notes.txt).',
    completed: false,
    terminalSetup: {
      initialDirectory: '/home/student/documents',
      message: 'Let\'s explore file permissions. Ensure notes.txt exists from the previous task.',
    },
    validationCommand: 'stat -c %a /home/student/documents/notes.txt | grep 400',
    successMessage: 'Excellent! File permissions for notes.txt are now correctly set.',
  },
  {
    id: 'task3',
    title: 'Working with Text Editors',
    description: 'Learn to use a simple text editor like nano.',
    details: 'Objective: Open "notes.txt" with nano and add the line "Hello, Terminal!" to it. Save and exit.',
    completed: false,
    terminalSetup: {
      initialDirectory: '/home/student/documents',
      message: 'Time to edit some files. Use `nano notes.txt` to proceed.',
    },
    validationCommand: 'cat /home/student/documents/notes.txt | grep "Hello, Terminal!"',
    successMessage: 'Well done! You\'ve successfully edited the file.',
  },
];
  