package com.example.quanlydaotao.n2.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.quanlydaotao.n2.entity.AdvisorClasseSection;

public interface AdvisorClasseSectionRepository
        extends JpaRepository<AdvisorClasseSection, UUID> {

    // Truy vấn bản ghi chưa bị xóa mềm
    List<AdvisorClasseSection> findByDeletedAtIsNull();

    Page<AdvisorClasseSection> findByDeletedAtIsNull(
            Pageable pageable);

    List<AdvisorClasseSection> findByDeletedAtIsNull(
            Sort sort);

    Optional<AdvisorClasseSection> findByIdAndDeletedAtIsNull(
            UUID id);

    // Truy vấn bản ghi đã xóa mềm
    List<AdvisorClasseSection> findByDeletedAtIsNotNull();

    // Lọc theo giảng viên và lớp
    List<AdvisorClasseSection> findByEmployeeIdAndDeletedAtIsNull(
            UUID employeeId);

    List<AdvisorClasseSection> findByStudentClasseIdAndDeletedAtIsNull(
            UUID studentClasseId);

    // Lọc theo trạng thái
    List<AdvisorClasseSection>
            findByIsActiveTrueAndDeletedAtIsNull();

    List<AdvisorClasseSection>
            findByIsActiveFalseAndDeletedAtIsNull();

    // Thống kê
    long countByDeletedAtIsNull();

    long countByDeletedAtIsNotNull();

    long countByIsActiveTrueAndDeletedAtIsNull();

    long countByIsActiveFalseAndDeletedAtIsNull();

    long countByEmployeeIdAndDeletedAtIsNull(
            UUID employeeId);

    long countByStudentClasseIdAndDeletedAtIsNull(
            UUID studentClasseId);
}