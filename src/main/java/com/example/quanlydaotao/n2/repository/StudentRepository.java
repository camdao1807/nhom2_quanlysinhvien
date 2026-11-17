
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

    // Lớp của sinh viên
    @Query(value = """
            SELECT scs.student_id AS studentId,
                   c.code AS classCode,
                   c.name AS className
            FROM dbo.student_classe_sections scs
            JOIN dbo.student_classes c
                ON c.id = scs.student_classe_id
            """, nativeQuery = true)
    List<Object[]> findAllStudentClassRows();

    // Trạng thái hiện tại
    @Query(value = """
            SELECT x.student_id, x.status_code, x.status_name
            FROM (
                SELECT ss.student_id,
                       ss.status_code,
                       ss.status_name,
                       ROW_NUMBER() OVER (
                           PARTITION BY ss.student_id
                           ORDER BY ss.start_date DESC
                       ) AS rn
                FROM dbo.student_status ss
                WHERE ss.start_date <= CURRENT_DATE
                  AND (
                      ss.end_date IS NULL
                      OR ss.end_date >= CURRENT_DATE
                  )
            ) x
            WHERE x.rn = 1
            """, nativeQuery = true)
    List<Object[]> findLatestStatusRows();

    // Xóa lớp cũ của sinh viên
    @Modifying
    @Transactional
    @Query(value = """
            DELETE FROM dbo.student_classe_sections
            WHERE student_id = CAST(:studentId AS UUID)
            """, nativeQuery = true)
    int deleteClassOfStudent(@Param("studentId") String studentId);

    // Gán lớp mới cho sinh viên
    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO dbo.student_classe_sections
                (id, student_id, student_classe_id)
            VALUES (
                gen_random_uuid(),
                CAST(:studentId AS UUID),
                CAST(:classId AS UUID)
            )
            """, nativeQuery = true)
    int insertClassOfStudent(
            @Param("studentId") String studentId,
            @Param("classId") String classId
    );
}
