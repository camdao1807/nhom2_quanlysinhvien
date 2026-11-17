package com.example.quanlydaotao.n2.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.quanlydaotao.n2.entity.AdvisorClasseSection;
import com.example.quanlydaotao.n2.service.AdvisorClasseSectionService;

@RestController
@RequestMapping("/api/advisor-classe-sections")
public class AdvisorClasseSectionController {

    private final AdvisorClasseSectionService service;

    public AdvisorClasseSectionController(
            AdvisorClasseSectionService service) {
        this.service = service;
    }

    // ==================== CRUD: API 1-5 ====================

    // 1. Lấy danh sách chưa bị xóa
    @GetMapping
    public List<AdvisorClasseSection> getAll() {
        return service.getAll();
    }

    // 2. Xem chi tiết
    @GetMapping("/{id}")
    public AdvisorClasseSection getById(
            @PathVariable UUID id) {
        return service.getById(id);
    }

    // 3. Thêm phân công
    @PostMapping
    public AdvisorClasseSection create(
            @Valid @RequestBody AdvisorClasseSection item) {
        return service.create(item);
    }

    // 4. Sửa phân công
    @PutMapping("/{id}")
    public AdvisorClasseSection update(
            @PathVariable UUID id,
            @Valid @RequestBody AdvisorClasseSection item) {
        return service.update(id, item);
    }

    // 5. Xóa mềm
    @DeleteMapping("/{id}")
    public AdvisorClasseSection delete(
            @PathVariable UUID id,
            @RequestParam(required = false) UUID deletedBy) {
        return service.delete(id, deletedBy);
    }

    // ==================== TÌM KIẾM: API 6-12 ====================

    // 6. Tìm theo ID phân công, ID giảng viên hoặc ID lớp
    @GetMapping("/search")
    public List<AdvisorClasseSection> search(
            @RequestParam String keyword) {
        return service.search(keyword);
    }

    // 7. Lọc theo giảng viên
    @GetMapping("/by-employee/{employeeId}")
    public List<AdvisorClasseSection> byEmployee(
            @PathVariable UUID employeeId) {
        return service.byEmployee(employeeId);
    }

    // 8. Lọc theo lớp
    @GetMapping("/by-class/{studentClasseId}")
    public List<AdvisorClasseSection> byClass(
            @PathVariable UUID studentClasseId) {
        return service.byClass(studentClasseId);
    }

    // 9. Phân công đang hoạt động
    @GetMapping("/active")
    public List<AdvisorClasseSection> active() {
        return service.getActive();
    }

    // 10. Phân công không hoạt động, chưa xóa
    @GetMapping("/inactive")
    public List<AdvisorClasseSection> inactive() {
        return service.getInactive();
    }

    // 11. Lọc theo ngày bắt đầu
    @GetMapping("/by-date")
    public List<AdvisorClasseSection> byDate(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime from,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime to) {

        return service.byDate(from, to);
    }

    // 12. Xem các bản ghi đã xóa mềm
    @GetMapping("/deleted")
    public List<AdvisorClasseSection> deleted() {
        return service.getDeleted();
    }

    // ==================== THỐNG KÊ: API 13-17 ====================

    // 13. Tổng số bản ghi chưa xóa
    @GetMapping("/count")
    public long countTotal() {
        return service.countTotal();
    }

    // 14. Số phân công hoạt động
    @GetMapping("/count/active")
    public long countActive() {
        return service.countActive();
    }

    // 15. Số phân công không hoạt động
    @GetMapping("/count/inactive")
    public long countInactive() {
        return service.countInactive();
    }

    // 16. Số phân công của giảng viên
    @GetMapping("/count/by-employee/{employeeId}")
    public long countByEmployee(
            @PathVariable UUID employeeId) {
        return service.countByEmployee(employeeId);
    }

    // 17. Số phân công của lớp
    @GetMapping("/count/by-class/{studentClasseId}")
    public long countByClass(
            @PathVariable UUID studentClasseId) {
        return service.countByClass(studentClasseId);
    }

    // ==================== KIỂM TRA: API 18-22 ====================

    // 18. Giảng viên có phân công chưa xóa không?
    @GetMapping("/check/employee/{employeeId}")
    public boolean checkEmployee(
            @PathVariable UUID employeeId) {
        return service.hasEmployee(employeeId);
    }

    // 19. Lớp có phân công chưa xóa không?
    @GetMapping("/check/class/{studentClasseId}")
    public boolean checkClass(
            @PathVariable UUID studentClasseId) {
        return service.hasClass(studentClasseId);
    }

    // 20. Cặp giảng viên - lớp đã có phân công chưa?
    @GetMapping("/check/assignment")
    public boolean checkAssignment(
            @RequestParam UUID employeeId,
            @RequestParam UUID studentClasseId) {

        return service.hasAssignment(employeeId, studentClasseId);
    }

    // 21. CVHT hiện tại của lớp
    @GetMapping("/current/by-class/{studentClasseId}")
    public List<AdvisorClasseSection> currentByClass(
            @PathVariable UUID studentClasseId) {
        return service.currentByClass(studentClasseId);
    }

    // 22. Lịch sử phân công của lớp
    @GetMapping("/history/by-class/{studentClasseId}")
    public List<AdvisorClasseSection> historyByClass(
            @PathVariable UUID studentClasseId) {
        return service.historyByClass(studentClasseId);
    }

    // ==================== TRẠNG THÁI: API 23-26 ====================

    // 23. Kích hoạt
    @PatchMapping("/{id}/activate")
    public AdvisorClasseSection activate(
            @PathVariable UUID id) {
        return service.activate(id);
    }

    // 24. Ngừng hoạt động
    @PatchMapping("/{id}/deactivate")
    public AdvisorClasseSection deactivate(
            @PathVariable UUID id) {
        return service.deactivate(id);
    }

    // 25. Khôi phục bản ghi đã xóa mềm
    @PatchMapping("/{id}/restore")
    public AdvisorClasseSection restore(
            @PathVariable UUID id) {
        return service.restore(id);
    }

    // 26. Cập nhật ngày kết thúc
    @PatchMapping("/{id}/end-date")
    public AdvisorClasseSection updateEndDate(
            @PathVariable UUID id,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime endDate) {

        return service.updateEndDate(id, endDate);
    }

    // ==================== TIỆN ÍCH: API 27-30 ====================

    // 27. 10 phân công mới nhất
    @GetMapping("/recent")
    public List<AdvisorClasseSection> recent() {
        return service.recent();
    }

    // 28. Phân trang
    @GetMapping("/pagination")
    public Page<AdvisorClasseSection> pagination(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        return service.pagination(page, size);
    }

    // 29. Sắp xếp
    @GetMapping("/sort")
    public List<AdvisorClasseSection> sort(
            @RequestParam(defaultValue = "startDate") String field,
            @RequestParam(defaultValue = "desc") String direction) {

        return service.sort(field, direction);
    }

    // 30. Thống kê tổng quan
    @GetMapping("/statistics/overview")
    public Map<String, Object> statisticsOverview() {
        return service.statisticsOverview();
    }
}