import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAttendance, getAttendanceForEmployees, getEmployees, getPendingDeletionRequests } from "./api";
import type { AttendanceRecord, DeletionRequest, Employee } from "./types";

const ATTENDANCE_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const ATTENDANCE_CACHE_TIME = 1000 * 60 * 30; // 30 minutes
const EMPLOYEE_STALE_TIME = 1000 * 60 * 10; // 10 minutes
const EMPLOYEE_CACHE_TIME = 1000 * 60 * 30; // 30 minutes
const REQUEST_STALE_TIME = 1000 * 60; // 1 minute

export const queryKeys = {
  employeeAttendance: (employeeId?: string, from?: string, to?: string) => ["attendance", employeeId ?? "none", from ?? "all", to ?? "all"] as const,
  employees: () => ["employees"] as const,
  attendanceForEmployees: (employeeIds: string[], from?: string, to?: string) => ["attendance-group", employeeIds.join(","), from ?? "all", to ?? "all"] as const,
  pendingDeletionRequests: () => ["pending-deletion-requests"] as const,
};

export function useEmployeeAttendance(employeeId?: string, from?: string, to?: string) {
  return useQuery<AttendanceRecord[]>({
    queryKey: queryKeys.employeeAttendance(employeeId, from, to),
    queryFn: () => getAttendance(employeeId!, from, to),
    enabled: Boolean(employeeId),
    staleTime: ATTENDANCE_STALE_TIME,
    cacheTime: ATTENDANCE_CACHE_TIME,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: queryKeys.employees(),
    queryFn: getEmployees,
    staleTime: EMPLOYEE_STALE_TIME,
    cacheTime: EMPLOYEE_CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useAttendanceForEmployees(employeeIds: string[], from?: string, to?: string) {
  return useQuery<Record<string, AttendanceRecord[]>>({
    queryKey: queryKeys.attendanceForEmployees(employeeIds, from, to),
    queryFn: () => getAttendanceForEmployees(employeeIds, from, to),
    enabled: employeeIds.length > 0,
    staleTime: ATTENDANCE_STALE_TIME,
    cacheTime: ATTENDANCE_CACHE_TIME,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
}

export function usePendingDeletionRequests() {
  return useQuery<DeletionRequest[]>({
    queryKey: queryKeys.pendingDeletionRequests(),
    queryFn: getPendingDeletionRequests,
    staleTime: REQUEST_STALE_TIME,
    cacheTime: EMPLOYEE_CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function prefetchEmployeeAttendance(queryClient: ReturnType<typeof useQueryClient>, employeeId: string, from?: string, to?: string) {
  return queryClient.prefetchQuery(queryKeys.employeeAttendance(employeeId, from, to), () => getAttendance(employeeId, from, to));
}

export function prefetchEmployees(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.prefetchQuery(queryKeys.employees(), getEmployees);
}
