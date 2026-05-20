package attendance.example.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardingController {

    @GetMapping({"/", "/login", "/signup", "/dashboard", "/timesheets", "/profile", "/admin", "/admin/monitor"})
    public String forwardToFrontend() {
        return "forward:/index.html";
    }
}
