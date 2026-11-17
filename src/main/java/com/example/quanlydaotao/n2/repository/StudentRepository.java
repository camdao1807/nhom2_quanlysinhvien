package com.example.quanlydaotao.n2.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.example.quanlydaotao.n2.entity.Student;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    boolean existsByCode(String code);

    @Query("SELECT s FROM Student s WHERE (s.isActive = true OR s.isActive IS NULL)")
    List<Student> findAllActive();

    @Query("SELECT s FROM Student s WHERE s.isActive = false")
    List<Student> findAllArchived();

    @Query("SELECT s FROM Student s WHERE (s.isActive = true OR s.isActive IS NULL) AND (LOWER(s.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<Student> searchActiveStudents(@Param("keyword") String keyword);

    // Lớp của sinh viên: [student_id, class_code, class_name]
    @Query(value = """
            SELECT scs.student_id AS studentId, c.code AS classCode, c.name AS className
            FROM student_classe_sections scs
            JOIN student_classes c ON c.id = scs.student_classe_id
            """, nativeQuery = true)
    List<Object[]> findAllStudentClassRows();

    // Trạng thái hiện tại: [student_id, status_code, status_name]
    @Query(value = """
            SELECT x.student_id, x.status_code, x.status_name
            FROM (
                SELECT ss.student_id, ss.status_code, ss.status_name,
                       ROW_NUMBER() OVER (
                           PARTITION BY ss.student_id
                           ORDER BY ss.start_date DESC
                       ) AS rn
                FROM student_status ss
                WHERE ss.start_date <= CAST(GETDATE() AS date)
                  AND (ss.end_date IS NULL OR ss.end_date >= CAST(GETDATE() AS date))
            ) x
            WHERE x.rn = 1
            """, nativeQuery = true)
    List<Object[]> findLatestStatusRows();

    // Phân lớp: xóa lớp cũ rồi gán lớp mới
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM student_classe_sections WHERE student_id = CAST(:studentId AS uniqueidentifier)",
            nativeQuery = true)
    int deleteClassOfStudent(@Param("studentId") String studentId);

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO student_classe_sections (id, student_id, student_classe_id)
            VALUES (NEWID(), CAST(:studentId AS uniqueidentifier), CAST(:classId AS uniqueidentifier))
            """, nativeQuery = true)
    int insertClassOfStudent(@Param("studentId") String studentId, @Param("classId") String classId);
}