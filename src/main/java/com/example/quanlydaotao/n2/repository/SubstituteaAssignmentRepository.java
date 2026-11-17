package com.example.quanlydaotao.n2.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.quanlydaotao.n2.entity.SubstituteaAssignment;

public interface SubstituteaAssignmentRepository
        extends JpaRepository<SubstituteaAssignment, UUID> {

    List<SubstituteaAssignment> findByDeletedAtIsNull(Sort sort);

    Optional<SubstituteaAssignment> findByIdAndDeletedAtIsNull(UUID id);

    // Chống trùng: cùng ngày + lớp + giáo viên dạy thay (khớp unique index)
    boolean existsByTeachingDateAndStudentClasseIdAndSubstituteEmployeeIdAndDeletedAtIsNull(
            LocalDate teachingDate, UUID studentClasseId, UUID substituteEmployeeId);

    boolean existsByTeachingDateAndStudentClasseIdAndSubstituteEmployeeIdAndDeletedAtIsNullAndIdNot(
            LocalDate teachingDate, UUID studentClasseId, UUID substituteEmployeeId, UUID id);
}