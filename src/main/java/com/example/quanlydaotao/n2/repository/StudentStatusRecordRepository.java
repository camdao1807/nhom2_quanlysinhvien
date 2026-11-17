package com.example.quanlydaotao.n2.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.quanlydaotao.n2.entity.StudentStatusRecord;

@Repository
public interface StudentStatusRecordRepository extends JpaRepository<StudentStatusRecord, UUID> {

    List<StudentStatusRecord> findByDeletedAtIsNull();

    Optional<StudentStatusRecord> findByIdAndDeletedAtIsNull(UUID id);

    List<StudentStatusRecord> findByStudentId(UUID studentId);

    List<StudentStatusRecord> findByStudentIdAndDeletedAtIsNull(UUID studentId);
}