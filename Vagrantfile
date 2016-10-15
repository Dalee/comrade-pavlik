Vagrant.require_version ">= 1.8.0"
Vagrant.configure("2") do |config|

	config.vm.box = "Dalee/ubuntu"
	config.vm.provider :virtualbox do |v|
		v.memory = 512
        v.cpus = 1
	end

	project_name = "pavlik"
	project_root = "/home/web/project"

	config.vm.network "private_network", type: "dhcp"
	config.vm.synced_folder ".", project_root, type: "nfs"
	config.vm.provision "shell", path: "build/ansible/scripts/vagrant-fix.sh"
	config.vm.provision "shell", path: "build/ansible/scripts/vagrant-ansible.sh",
		env: {
			"PROJECT_ROOT": project_root,
			"PROJECT_NAME": project_name,
		},
		keep_color: true
end
