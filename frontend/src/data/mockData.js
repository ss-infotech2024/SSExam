export const mockData = {
  // Department-wise Results Data
  departmentResults: [
    {
      id: 1,
      department: "Science",
      totalStudents: 450,
      appearedStudents: 425,
      passedStudents: 380,
      failedStudents: 45,
      averageScore: 78.5,
      highestScore: 98,
      lowestScore: 32,
      exams: [
        { name: "Physics Mid-term", conducted: "2024-01-15", appeared: 210, passed: 185, avgScore: 76.5 },
        { name: "Chemistry Final", conducted: "2024-01-20", appeared: 215, passed: 195, avgScore: 80.2 },
      ]
    },
    {
      id: 2,
      department: "Commerce",
      totalStudents: 380,
      appearedStudents: 360,
      passedStudents: 320,
      failedStudents: 40,
      averageScore: 75.2,
      highestScore: 96,
      lowestScore: 28,
      exams: [
        { name: "Accounts Exam", conducted: "2024-01-16", appeared: 180, passed: 160, avgScore: 74.8 },
        { name: "Economics Test", conducted: "2024-01-21", appeared: 180, passed: 160, avgScore: 75.6 },
      ]
    },
    {
      id: 3,
      department: "Arts",
      totalStudents: 290,
      appearedStudents: 275,
      passedStudents: 250,
      failedStudents: 25,
      averageScore: 82.3,
      highestScore: 99,
      lowestScore: 35,
      exams: [
        { name: "History Exam", conducted: "2024-01-17", appeared: 140, passed: 128, avgScore: 81.2 },
        { name: "Literature Test", conducted: "2024-01-22", appeared: 135, passed: 122, avgScore: 83.4 },
      ]
    },
    {
      id: 4,
      department: "Engineering",
      totalStudents: 130,
      appearedStudents: 125,
      passedStudents: 110,
      failedStudents: 15,
      averageScore: 76.8,
      highestScore: 95,
      lowestScore: 30,
      exams: [
        { name: "Mathematics Exam", conducted: "2024-01-18", appeared: 65, passed: 58, avgScore: 77.5 },
        { name: "Physics Test", conducted: "2024-01-23", appeared: 60, passed: 52, avgScore: 76.0 },
      ]
    }
  ],

  // Student Data
  studentData: [
    {
      id: "S001",
      name: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      department: "Science",
      semester: "4th",
      enrollmentNo: "SCI2022001",
      exams: [
        { name: "Physics Mid-term", score: 85, status: "passed", date: "2024-01-15" },
        { name: "Chemistry Final", score: 78, status: "passed", date: "2024-01-20" },
      ],
      totalExams: 8,
      averageScore: 82.5,
      lastActive: "2024-01-24",
      status: "active"
    },
    {
      id: "S002",
      name: "Priya Patel",
      email: "priya.p@example.com",
      department: "Science",
      semester: "6th",
      enrollmentNo: "SCI2020002",
      exams: [
        { name: "Physics Mid-term", score: 92, status: "passed", date: "2024-01-15" },
        { name: "Chemistry Final", score: 88, status: "passed", date: "2024-01-20" },
      ],
      totalExams: 12,
      averageScore: 89.2,
      lastActive: "2024-01-24",
      status: "active"
    },
    {
      id: "S003",
      name: "Amit Kumar",
      email: "amit.k@example.com",
      department: "Commerce",
      semester: "4th",
      enrollmentNo: "COM2022003",
      exams: [
        { name: "Accounts Exam", score: 45, status: "failed", date: "2024-01-16" },
        { name: "Economics Test", score: 52, status: "failed", date: "2024-01-21" },
      ],
      totalExams: 8,
      averageScore: 48.5,
      lastActive: "2024-01-23",
      status: "active"
    },
    {
      id: "S004",
      name: "Neha Singh",
      email: "neha.s@example.com",
      department: "Arts",
      semester: "2nd",
      enrollmentNo: "ART2023004",
      exams: [
        { name: "History Exam", score: 95, status: "passed", date: "2024-01-17" },
        { name: "Literature Test", score: 88, status: "passed", date: "2024-01-22" },
      ],
      totalExams: 4,
      averageScore: 91.5,
      lastActive: "2024-01-24",
      status: "active"
    },
    {
      id: "S005",
      name: "Vikram Mehta",
      email: "vikram.m@example.com",
      department: "Engineering",
      semester: "6th",
      enrollmentNo: "ENG2020005",
      exams: [
        { name: "Mathematics Exam", score: 72, status: "passed", date: "2024-01-18" },
        { name: "Physics Test", score: 68, status: "passed", date: "2024-01-23" },
      ],
      totalExams: 12,
      averageScore: 70.2,
      lastActive: "2024-01-24",
      status: "inactive"
    },
    {
      id: "S006",
      name: "Anjali Desai",
      email: "anjali.d@example.com",
      department: "Commerce",
      semester: "4th",
      enrollmentNo: "COM2022006",
      exams: [
        { name: "Accounts Exam", score: 88, status: "passed", date: "2024-01-16" },
        { name: "Economics Test", score: 92, status: "passed", date: "2024-01-21" },
      ],
      totalExams: 8,
      averageScore: 90.0,
      lastActive: "2024-01-24",
      status: "active"
    }
  ],

  // Student Exam Details
  studentExamDetails: [
    {
      studentId: "S001",
      examHistory: [
        { examName: "Physics Mid-term", date: "2024-01-15", score: 85, totalMarks: 100, percentage: 85, rank: 12, timeTaken: "45 mins", status: "passed" },
        { examName: "Chemistry Final", date: "2024-01-20", score: 78, totalMarks: 100, percentage: 78, rank: 23, timeTaken: "52 mins", status: "passed" },
        { examName: "Biology Test", date: "2023-12-10", score: 92, totalMarks: 100, percentage: 92, rank: 5, timeTaken: "38 mins", status: "passed" },
        { examName: "Mathematics Exam", date: "2023-11-15", score: 88, totalMarks: 100, percentage: 88, rank: 15, timeTaken: "50 mins", status: "passed" },
      ]
    },
    {
      studentId: "S003",
      examHistory: [
        { examName: "Accounts Exam", date: "2024-01-16", score: 45, totalMarks: 100, percentage: 45, rank: 45, timeTaken: "60 mins", status: "failed" },
        { examName: "Economics Test", date: "2024-01-21", score: 52, totalMarks: 100, percentage: 52, rank: 38, timeTaken: "55 mins", status: "failed" },
        { examName: "Business Studies", date: "2023-12-12", score: 38, totalMarks: 100, percentage: 38, rank: 42, timeTaken: "58 mins", status: "failed" },
      ]
    }
  ]
};