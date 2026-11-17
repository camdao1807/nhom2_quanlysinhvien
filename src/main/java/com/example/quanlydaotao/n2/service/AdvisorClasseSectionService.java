package com.example.quanlydaotao.n2.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.quanlydaotao.n2.entity.AdvisorClasseSection;
import com.example.quanlydaotao.n2.repository.AdvisorClasseSectionRepository;

@Service
public class AdvisorClasseSectionService {

    private final AdvisorClasseSectionRepository repository;

    private static final Set<String> SORT_FIELDS = Set.of(
            "id",
            "employeeId",
            "studentClasseId",
            "startDate",
            "endDate",
            "createdAt",
            "updatedAt",
            "isActive"
    );

    public AdvisorClasseSectionService(
            AdvisorClasseSectionRepository repository) {
        this.repository = repository;
    }

    // ==================== CRUD: API 1-5 ====================

    public List<AdvisorClasseSection> getAll() {
        return repository.findByDeletedAtIsNull();
    }

    public AdvisorClasseSection getById(UUID id) {
        return repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy phân công đang tồn tại"));
    }

    private void validate(AdvisorClasseSection item) {
        if (item.getEmployeeId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID giảng viên không được để trống");
        }

        if (item.getStudentClasseId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "ID lớp hành chính không được để trống");
        }

        if (item.getStartDate() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu không được để trống");
        }

        if (item.getEndDate() != null
                && item.getEndDate().isBefore(item.getStartDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày kết thúc không được trước ngày bắt đầu");
        }
    }

    @Transactional
    public AdvisorClasseSection create(AdvisorClasseSection item) {
        validate(item);

        item.setId(null);
        item.setCreatedAt(LocalDateTime.now());
        item.setUpdatedAt(null);
        item.setDeletedAt(null);
        item.setDeletedBy(null);
        item.setIsActive(true);

        return repository.save(item);
    }

    @Transactional
    public AdvisorClasseSection update(
            UUID id, AdvisorClasseSection request) {

        AdvisorClasseSection item = getById(id);
        validate(request);

        item.setEmployeeId(request.getEmployeeId());
        item.setStudentClasseId(request.getStudentClasseId());
        item.setStartDate(request.getStartDate());
        item.setEndDate(request.getEndDate());
        item.setUpdatedBy(request.getUpdatedBy());

        if (request.getIsActive() != null) {
            item.setIsActive(request.getIsActive());
        }

        item.setUpdatedAt(LocalDateTime.now());

        return repository.save(item);
    }

    @Transactional
    public AdvisorClasseSection delete(UUID id, UUID deletedBy) {
        AdvisorClasseSection item = getById(id);

        item.setDeletedAt(LocalDateTime.now());
        item.setDeletedBy(deletedBy);
        item.setIsActive(false);

        return repository.save(item);
    }

    // ==================== TÌM KIẾM: API 6-12 ====================

    public List<AdvisorClasseSection> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return getAll();
        }

        String key = keyword.trim().toLowerCase();

        return getAll().stream()
                .filter(x ->
                        contains(x.getId(), key)
                        || contains(x.getEmployeeId(), key)
                        || contains(x.getStudentClasseId(), key))
                .toList();
    }

    private boolean contains(UUID value, String keyword) {
        return value != null
                && value.toString().toLowerCase().contains(keyword);
    }

    public List<AdvisorClasseSection> byEmployee(UUID employeeId) {
        return repository.findByEmployeeIdAndDeletedAtIsNull(employeeId);
    }

    public List<AdvisorClasseSection> byClass(UUID studentClasseId) {
        return repository.findByStudentClasseIdAndDeletedAtIsNull(
                studentClasseId);
    }

    public List<AdvisorClasseSection> getActive() {
        return repository.findByIsActiveTrueAndDeletedAtIsNull();
    }

    public List<AdvisorClasseSection> getInactive() {
        return repository.findByIsActiveFalseAndDeletedAtIsNull();
    }

    public List<AdvisorClasseSection> byDate(
            LocalDateTime from, LocalDateTime to) {

        if (from == null || to == null || from.isAfter(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Khoảng thời gian không hợp lệ");
        }

        return getAll().stream()
                .filter(x -> x.getStartDate() != null)
                .filter(x -> !x.getStartDate().isBefore(from)
                        && !x.getStartDate().isAfter(to))
                .toList();
    }

    public List<AdvisorClasseSection> getDeleted() {
        return repository.findByDeletedAtIsNotNull();
    }

    // ==================== THỐNG KÊ: API 13-17 ====================

    public long countTotal() {
        return repository.countByDeletedAtIsNull();
    }

    public long countActive() {
        return repository.countByIsActiveTrueAndDeletedAtIsNull();
    }

    public long countInactive() {
        return repository.countByIsActiveFalseAndDeletedAtIsNull();
    }

    public long countByEmployee(UUID employeeId) {
        return repository.countByEmployeeIdAndDeletedAtIsNull(employeeId);
    }

    public long countByClass(UUID studentClasseId) {
        return repository.countByStudentClasseIdAndDeletedAtIsNull(
                studentClasseId);
    }

    // ==================== KIỂM TRA PHÂN CÔNG: API 18-22 ====================

    public boolean hasEmployee(UUID employeeId) {
        return countByEmployee(employeeId) > 0;
    }

    public boolean hasClass(UUID studentClasseId) {
        return countByClass(studentClasseId) > 0;
    }

    public boolean hasAssignment(
            UUID employeeId, UUID studentClasseId) {

        return byEmployee(employeeId).stream()
                .anyMatch(x -> studentClasseId.equals(
                        x.getStudentClasseId()));
    }

    public List<AdvisorClasseSection> currentByClass(
            UUID studentClasseId) {

        LocalDateTime now = LocalDateTime.now();

        return byClass(studentClasseId).stream()
                .filter(x -> Boolean.TRUE.equals(x.getIsActive()))
                .filter(x -> x.getStartDate() != null
                        && !x.getStartDate().isAfter(now))
                .filter(x -> x.getEndDate() == null
                        || !x.getEndDate().isBefore(now))
                .toList();
    }

    public List<AdvisorClasseSection> historyByClass(
            UUID studentClasseId) {

        return byClass(studentClasseId).stream()
                .sorted(Comparator.comparing(
                        AdvisorClasseSection::getStartDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    // ==================== TRẠNG THÁI: API 23-26 ====================

    @Transactional
    public AdvisorClasseSection activate(UUID id) {
        AdvisorClasseSection item = getById(id);
        item.setIsActive(true);
        item.setUpdatedAt(LocalDateTime.now());
        return repository.save(item);
    }

    @Transactional
    public AdvisorClasseSection deactivate(UUID id) {
        AdvisorClasseSection item = getById(id);
        item.setIsActive(false);
        item.setUpdatedAt(LocalDateTime.now());
        return repository.save(item);
    }

    @Transactional
    public AdvisorClasseSection restore(UUID id) {
        AdvisorClasseSection item = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy phân công"));

        if (item.getDeletedAt() == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Phân công này chưa bị xóa");
        }

        item.setDeletedAt(null);
        item.setDeletedBy(null);
        item.setIsActive(true);
        item.setUpdatedAt(LocalDateTime.now());

        return repository.save(item);
    }

    @Transactional
    public AdvisorClasseSection updateEndDate(
            UUID id, LocalDateTime endDate) {

        AdvisorClasseSection item = getById(id);

        if (endDate != null && item.getStartDate() != null
                && endDate.isBefore(item.getStartDate())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Ngày kết thúc không được trước ngày bắt đầu");
        }

        item.setEndDate(endDate);
        item.setUpdatedAt(LocalDateTime.now());

        return repository.save(item);
    }

    // ==================== TIỆN ÍCH: API 27-30 ====================

    public List<AdvisorClasseSection> recent() {
        return repository.findByDeletedAtIsNull(
                PageRequest.of(
                        0, 10,
                        Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
    }

    public Page<AdvisorClasseSection> pagination(
            int page, int size) {

        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "page phải >= 0 và size phải từ 1 đến 100");
        }

        return repository.findByDeletedAtIsNull(
                PageRequest.of(
                        page, size,
                        Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    public List<AdvisorClasseSection> sort(
            String field, String direction) {

        if (field == null || !SORT_FIELDS.contains(field)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Trường sắp xếp không hợp lệ");
        }

        Sort.Direction sortDirection;

        try {
            sortDirection = Sort.Direction.fromString(direction);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "direction chỉ nhận asc hoặc desc");
        }

        return repository.findByDeletedAtIsNull(
                Sort.by(sortDirection, field));
    }

    public Map<String, Object> statisticsOverview() {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("total", countTotal());
        result.put("active", countActive());
        result.put("inactive", countInactive());
        result.put("deleted", repository.countByDeletedAtIsNotNull());

        return result;
    }
}