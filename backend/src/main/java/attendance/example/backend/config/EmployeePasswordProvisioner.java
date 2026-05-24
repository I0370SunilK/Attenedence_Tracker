package attendance.example.backend.config;

import attendance.example.backend.service.EmployeeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class EmployeePasswordProvisioner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(EmployeePasswordProvisioner.class);

    private final EmployeeService employeeService;

    public EmployeePasswordProvisioner(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        int updatedCount = employeeService.provisionMissingPasswords();
        if (updatedCount > 0) {
            log.warn(
                    "Provisioned default password for {} employee accounts missing credentials. Ask affected users to change passwords after login.",
                    updatedCount
            );
        } else {
            log.info("All employee accounts already have stored passwords.");
        }
    }
}
