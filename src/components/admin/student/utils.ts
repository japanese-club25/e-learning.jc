import { Student, StudentStats } from './types';

export const calculateStudentStats = (student: Student): StudentStats => {
  const scores = student.scores ?? [];
  if (scores.length === 0) {
    return {
      totalScore: 0,
      totalExams: 0,
      averageScore: 0,
      bestScore: 0,
      rank: 0
    };
  }

  // Handle percentage as Decimal (from Prisma) - convert to number
  const percentageScores = scores.map(score => {
    // Convert Decimal/string to number, fallback to calculating from score/total_questions
    if (score.percentage !== null && score.percentage !== undefined) {
      const percentageValue = typeof score.percentage === 'number' ? score.percentage : parseFloat(score.percentage.toString());
      return !isNaN(percentageValue) ? percentageValue : (score.total_questions > 0 ? (score.score / score.total_questions) * 100 : 0);
    }
    // Fallback: calculate percentage from score and total_questions
    return score.total_questions > 0 ? (score.score / score.total_questions) * 100 : 0;
  });
  
  const totalExams = scores.length;
  const averageScore = percentageScores.reduce((sum, percentage) => sum + percentage, 0) / totalExams;
  const bestScore = Math.max(...percentageScores);
  const totalScore = percentageScores.reduce((sum, percentage) => sum + percentage, 0);

  return {
    totalScore,
    totalExams,
    averageScore,
    bestScore,
    rank: 0 // Will be calculated when all students are available
  };
};

export const calculateStudentRank = (student: Student, allStudents: Student[]): number => {
  const allAverages = allStudents.map(s => {
    const scores = s.scores ?? [];
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => {
      // Handle percentage as Decimal (from Prisma) - convert to number
      if (score.percentage !== null && score.percentage !== undefined) {
        const percentageValue = typeof score.percentage === 'number' ? score.percentage : parseFloat(score.percentage.toString());
        return sum + (!isNaN(percentageValue) ? percentageValue : (score.total_questions > 0 ? (score.score / score.total_questions) * 100 : 0));
      }
      // Fallback: calculate percentage from score and total_questions
      return sum + (score.total_questions > 0 ? (score.score / score.total_questions) * 100 : 0);
    }, 0) / scores.length;
  }).sort((a, b) => b - a);
  
  const studentStats = calculateStudentStats(student);
  return allAverages.indexOf(studentStats.averageScore) + 1;
};

export const getTopStudents = (students: Student[], limit: number = 10) => {
  return students
    .map(student => ({
      ...student,
      stats: calculateStudentStats(student)
    }))
    .filter(student => student.stats.totalExams > 0)
    .sort((a, b) => b.stats.averageScore - a.stats.averageScore)
    .slice(0, limit);
};

export const getPerformanceGrade = (average: number) => {
  if (average >= 90) return { grade: 'A+', color: 'text-green-600 bg-green-50 border-green-200' };
  if (average >= 80) return { grade: 'A', color: 'text-green-600 bg-green-50 border-green-200' };
  if (average >= 70) return { grade: 'B', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  if (average >= 60) return { grade: 'C', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  return { grade: 'D', color: 'text-red-600 bg-red-50 border-red-200' };
};

export const exportStudentsToCSV = (students: Student[]) => {
  const csvData = students.map(student => {
    const stats = calculateStudentStats(student);
    return {
      Name: student.name,
      Class: student.class,
      'Exam Code': student.exam_code,
      Category: student.category,
      Status: student.is_submitted ? 'Submitted' : 'In Progress',
      'Average Score': stats.averageScore.toFixed(1) + '%',
      'Best Score': stats.bestScore.toFixed(1) + '%',
      'Total Exams': stats.totalExams,
      Violations: student.violations,
      'Created At': new Date(student.created_at).toLocaleDateString()
    };
  });

  const headers = Object.keys(csvData[0] || {});
  const csvContent = [
    headers.join(','),
    ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `students_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
